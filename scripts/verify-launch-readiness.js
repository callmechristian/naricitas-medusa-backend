#!/usr/bin/env node
/**
 * End-to-end launch-readiness verification via Medusa Store API.
 *
 * Verifies on the local backend:
 * - product is listed and in stock
 * - cart can be created and populated
 * - TEST10 promotion applies
 * - shipping option can be selected
 * - tax (21% ES VAT) calculates
 * - order creation decrements inventory
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_API_KEY || 'pk_e134b0da1f7f2f092c77b4a65ae06e6bee55dd2b57e15e42524a15a43adee7e5';
const PROMO_CODE = 'TEST10';
const EXPECTED_TAX_RATE = 0.21;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForBackend(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error('Backend did not become healthy in time');
}

async function storeGet(path) {
  const res = await fetch(`${BASE_URL}/store/${path.replace(/^\//, '')}`, {
    headers: { 'x-publishable-api-key': PUBLISHABLE_KEY },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Store GET ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function storePost(path, body) {
  const res = await fetch(`${BASE_URL}/store/${path.replace(/^\//, '')}`, {
    method: 'POST',
    headers: {
      'x-publishable-api-key': PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Store POST ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function adminLogin() {
  const res = await fetch(`${BASE_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.MEDUSA_ADMIN_EMAIL || 'admin@naricitas.shop',
      password: process.env.MEDUSA_ADMIN_PASSWORD || 'Admin123!',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Admin login failed: ${JSON.stringify(data)}`);
  return data.token;
}

async function adminGet(token, path) {
  const res = await fetch(`${BASE_URL}/admin/${path.replace(/^\//, '')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Admin GET ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function adminPost(token, path, body) {
  const res = await fetch(`${BASE_URL}/admin/${path.replace(/^\//, '')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Admin POST ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  console.log('[verify] Waiting for backend...');
  await waitForBackend();

  // 1. Product is listed and in stock.
  const { products } = await storeGet('/products?handle=launch-readiness-treat');
  assert(products?.length === 1, 'Expected exactly one launch-readiness-treat product');
  const product = products[0];
  console.log('[verify] Product:', product.id, product.title);
  const variant = product.variants?.[0];
  assert(variant, 'Product has no variants');
  console.log('[verify] Variant:', variant.id, 'manage_inventory:', variant.manage_inventory);
  assert(variant.manage_inventory === true, 'Variant should manage inventory');

  // Capture pre-order inventory level via admin.
  const adminToken = await adminLogin();
  const variantDetail = await adminGet(adminToken, `/products/${product.id}/variants/${variant.id}?fields=*inventory_items`);
  const inventoryItemId = variantDetail?.variant?.inventory_items?.[0]?.inventory_item_id;
  assert(inventoryItemId, 'Variant should be linked to an inventory item');
  const preLevel = await adminGet(adminToken, `/inventory-items/${inventoryItemId}/location-levels?limit=10`);
  const preStocked = preLevel?.inventory_levels?.[0]?.stocked_quantity;
  console.log('[verify] Pre-order inventory level:', preStocked);
  assert(typeof preStocked === 'number' && preStocked >= 1, 'Pre-order inventory level should be >= 1');

  // 2. Create cart and add line item.
  const { regions } = await storeGet('/regions?limit=1');
  const regionId = regions?.[0]?.id;
  assert(regionId, 'No region available');

  const { cart } = await storePost('/carts', { region_id: regionId });
  assert(cart?.id, 'Cart should be created');
  console.log('[verify] Cart:', cart.id);

  await storePost(`/carts/${cart.id}/line-items`, { variant_id: variant.id, quantity: 1 });
  console.log('[verify] Added 1 item to cart');

  // 3. Update cart with ES shipping address so tax applies.
  await storePost(`/carts/${cart.id}`, {
    email: 'test@naricitas.shop',
    shipping_address: {
      first_name: 'Test',
      last_name: 'Buyer',
      address_1: 'Calle Mayor 1',
      city: 'Madrid',
      country_code: 'es',
      postal_code: '28001',
      phone: '+34123456789',
    },
  });
  console.log('[verify] Set shipping address (ES)');

  // 4. Apply TEST10 promotion.
  await storePost(`/carts/${cart.id}/promotions`, { promo_codes: [PROMO_CODE] });
  console.log('[verify] Applied promotion', PROMO_CODE);

  // 5. Select shipping option.
  const shippingOptions = await storeGet(`/shipping-options?cart_id=${cart.id}`);
  const shippingOption = shippingOptions?.shipping_options?.find((o) => o.name === 'Standard Shipping');
  assert(shippingOption, 'Standard Shipping option should be available for cart');
  await storePost(`/carts/${cart.id}/shipping-methods`, { option_id: shippingOption.id });
  console.log('[verify] Selected shipping option:', shippingOption.id);

  // 6. Retrieve cart and assert totals.
  const { cart: updatedCart } = await storeGet(`/carts/${cart.id}`);
  const itemSubtotal = Number(updatedCart.item_subtotal);
  const shippingSubtotal = Number(updatedCart.shipping_subtotal);
  const taxTotal = Number(updatedCart.tax_total);
  const discountSubtotal = Number(updatedCart.discount_subtotal);
  const total = Number(updatedCart.total);

  console.log('[verify] Cart totals:', {
    itemSubtotal,
    shippingSubtotal,
    taxTotal,
    discountSubtotal,
    total,
    currency: updatedCart.currency_code,
  });

  assert(itemSubtotal === 1000, `Item subtotal should be 1000 EUR cents, got ${itemSubtotal}`);
  assert(shippingSubtotal === 500, `Shipping subtotal should be 500 EUR cents, got ${shippingSubtotal}`);
  assert(discountSubtotal === 100, `Discount subtotal should be 100 EUR cents (10% of item subtotal), got ${discountSubtotal}`);

  // Tax should be calculated on (item_subtotal - discount + shipping).
  const taxableAmount = itemSubtotal - discountSubtotal + shippingSubtotal;
  const expectedTax = Math.round(taxableAmount * EXPECTED_TAX_RATE);
  assert(taxTotal === expectedTax, `Tax total should be ${expectedTax} (21% of ${taxableAmount}), got ${taxTotal}`);

  const expectedTotal = itemSubtotal - discountSubtotal + shippingSubtotal + taxTotal;
  assert(total === expectedTotal, `Total should be ${expectedTotal}, got ${total}`);

  // 7. Complete cart as a payment-collection order (skipping Stripe).
  // Create the collection and a system-default session; the cart completion
  // workflow authorizes it internally.
  const paymentCollection = await storePost(`/payment-collections`, { cart_id: cart.id });
  const pcId = paymentCollection?.payment_collection?.id;
  assert(pcId, 'Payment collection should be created');
  const sessionsRes = await storePost(`/payment-collections/${pcId}/payment-sessions`, { provider_id: 'pp_system_default' });
  const session = sessionsRes?.payment_collection?.payment_sessions?.[0];
  assert(session, 'Payment session should be created');
  console.log('[verify] Created payment session:', session.id);

  const completed = await storePost(`/carts/${cart.id}/complete`, {});
  const orderId = completed?.order?.id;
  assert(orderId, `Cart completion should produce an order: ${JSON.stringify(completed)}`);
  console.log('[verify] Order created:', orderId);

  // 8. Verify inventory was reserved (Medusa v2 reserves on order completion
  // and decrements stocked_quantity only on fulfillment).
  const postLevel = await adminGet(adminToken, `/inventory-items/${inventoryItemId}/location-levels?limit=10`);
  const postReserved = postLevel?.inventory_levels?.[0]?.reserved_quantity;
  const preReserved = preLevel?.inventory_levels?.[0]?.reserved_quantity || 0;
  console.log('[verify] Post-order reserved quantity:', postReserved);
  assert(postReserved === preReserved + 1, `Inventory should reserve 1 unit: ${preReserved} -> ${postReserved}`);

  console.log('\n[verify] ✅ Launch-readiness verification passed');
  console.log({
    productId: product.id,
    variantId: variant.id,
    cartId: cart.id,
    orderId,
    itemSubtotal,
    shippingSubtotal,
    taxTotal,
    discountSubtotal,
    total,
    preReserved,
    postReserved,
  });
}

main().catch((err) => {
  console.error('[verify] ❌', err.message);
  process.exit(1);
});
