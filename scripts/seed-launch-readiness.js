#!/usr/bin/env node
/**
 * Seed script for Naricitas Medusa launch-readiness verification.
 *
 * Idempotently configures the local Medusa backend with:
 * - a EUR region (ES/FR/RO)
 * - a 21% default VAT tax rate
 * - a default shipping profile + "Standard Shipping" option (€5)
 * - a test product with managed inventory (quantity 100)
 * - a 10%-off promotion code
 * - a publishable API key for the storefront
 *
 * Run after migrations and after creating the admin user:
 *   node scripts/seed-launch-readiness.js
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@naricitas.shop';
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || 'Admin123!';

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

async function login() {
  const res = await fetch(`${BASE_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Admin login failed: ${JSON.stringify(data)}`);
  return data.token;
}

async function adminGet(token, path) {
  const res = await fetch(`${BASE_URL}/admin/${path.replace(/^\//, '')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
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
  if (!res.ok) {
    throw new Error(`Admin POST ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function ensureRegion(token) {
  const list = await adminGet(token, '/regions?limit=10');
  const existing = list?.regions?.find((r) => r.currency_code === 'eur');
  if (existing) {
    console.log('[seed] Region already exists:', existing.id);
    return existing;
  }
  const { region } = await adminPost(token, '/regions', {
    name: 'Naricitas EU',
    currency_code: 'eur',
    countries: ['es', 'fr', 'ro'],
    automatic_taxes: true,
  });
  console.log('[seed] Created region:', region.id);
  return region;
}

async function ensureTaxRegionAndRate(token, region) {
  const list = await adminGet(token, `/tax-regions?country_code=es&limit=10`);
  let taxRegion = list?.tax_regions?.[0];
  if (!taxRegion) {
    const created = await adminPost(token, '/tax-regions', {
      country_code: 'es',
      province_code: null,
      provider_id: 'tp_system',
      default_tax_rate: {
        name: 'ES VAT',
        code: 'ES_VAT',
        rate: 21,
        is_default: true,
      },
    });
    taxRegion = created.tax_region;
    console.log('[seed] Created tax region:', taxRegion.id);
  } else {
    console.log('[seed] Tax region already exists:', taxRegion.id);
  }

  const rates = await adminGet(token, `/tax-rates?tax_region_id=${taxRegion.id}&limit=10`);
  if (rates?.tax_rates?.length > 0) {
    console.log('[seed] Tax rate already exists:', rates.tax_rates[0].id);
    return { taxRegion, taxRate: rates.tax_rates[0] };
  }
  const { tax_rate } = await adminPost(token, '/tax-rates', {
    name: 'Standard VAT',
    tax_region_id: taxRegion.id,
    code: 'VAT',
    rate: 21,
    is_default: true,
  });
  console.log('[seed] Created tax rate:', tax_rate.id);
  return { taxRegion, taxRate: tax_rate };
}

async function ensureShippingProfile(token) {
  const list = await adminGet(token, '/shipping-profiles?limit=10');
  const existing = list?.shipping_profiles?.[0];
  if (existing) {
    console.log('[seed] Shipping profile already exists:', existing.id);
    return existing;
  }
  const { shipping_profile } = await adminPost(token, '/shipping-profiles', {
    name: 'Default Shipping Profile',
    type: 'default',
  });
  console.log('[seed] Created shipping profile:', shipping_profile.id);
  return shipping_profile;
}

async function ensureStockLocation(token, salesChannel) {
  const list = await adminGet(token, '/stock-locations?limit=10');
  const existing = list?.stock_locations?.[0];
  if (existing) {
    console.log('[seed] Stock location already exists:', existing.id);
    await ensureLocationHasManualProvider(token, existing.id);
    await ensureLocationSalesChannel(token, existing.id, salesChannel.id);
    // Fetch with relations so downstream helpers can inspect fulfillment sets.
    const detail = await adminGet(token, `/stock-locations/${existing.id}?fields=*fulfillment_sets, *fulfillment_sets.service_zones`);
    return detail?.stock_location || existing;
  }
  const { stock_location } = await adminPost(token, '/stock-locations', {
    name: 'Naricitas Warehouse',
    address: {
      address_1: 'Calle Mayor 1',
      city: 'Madrid',
      country_code: 'ES',
      postal_code: '28001',
    },
  });
  console.log('[seed] Created stock location:', stock_location.id);
  await ensureLocationHasManualProvider(token, stock_location.id);
  await ensureLocationSalesChannel(token, stock_location.id, salesChannel.id);
  return stock_location;
}

async function ensureLocationHasManualProvider(token, locationId) {
  const detail = await adminGet(token, `/stock-locations/${locationId}?fields=*fulfillment_providers`);
  const providers = detail?.stock_location?.fulfillment_providers || [];
  if (providers.some((p) => p.id === 'manual_manual')) {
    console.log('[seed] Manual provider already enabled for location');
    return;
  }
  await adminPost(token, `/stock-locations/${locationId}/fulfillment-providers`, {
    add: ['manual_manual'],
  });
  console.log('[seed] Enabled manual fulfillment provider for location');
}

async function ensureLocationSalesChannel(token, locationId, salesChannelId) {
  const detail = await adminGet(token, `/stock-locations/${locationId}?fields=*sales_channels`);
  const channels = detail?.stock_location?.sales_channels || [];
  if (channels.some((c) => c.id === salesChannelId)) {
    console.log('[seed] Sales channel already linked to location');
    return;
  }
  await adminPost(token, `/stock-locations/${locationId}/sales-channels`, {
    add: [salesChannelId],
  });
  console.log('[seed] Linked sales channel to location');
}

async function ensureFulfillmentSet(token, location) {
  // Reload with relations to see any existing fulfillment sets and their zones.
  const detail = await adminGet(token, `/stock-locations/${location.id}?fields=*fulfillment_sets, *fulfillment_sets.service_zones`);
  const withSets = detail?.stock_location || location;
  if (withSets.fulfillment_sets?.length > 0) {
    const existing = withSets.fulfillment_sets.find((fs) => fs.type === 'shipping');
    if (existing) {
      console.log('[seed] Fulfillment set already exists:', existing.id);
      return existing;
    }
  }
  await adminPost(token, `/stock-locations/${location.id}/fulfillment-sets`, {
    name: 'Shipping',
    type: 'shipping',
  });
  const refreshed = await adminGet(token, `/stock-locations/${location.id}?fields=*fulfillment_sets, *fulfillment_sets.service_zones`);
  const fulfillmentSet = refreshed?.stock_location?.fulfillment_sets?.find((fs) => fs.type === 'shipping');
  if (!fulfillmentSet) throw new Error('Could not find created fulfillment set');
  console.log('[seed] Created fulfillment set:', fulfillmentSet.id);
  return fulfillmentSet;
}

async function ensureServiceZone(token, fulfillmentSet) {
  const zones = fulfillmentSet.service_zones || [];
  const existing = zones.find((sz) => sz.name === 'EU Zone');
  if (existing) {
    console.log('[seed] Service zone already exists:', existing.id);
    return existing;
  }
  const { fulfillment_set } = await adminPost(token, `/fulfillment-sets/${fulfillmentSet.id}/service-zones`, {
    name: 'EU Zone',
    geo_zones: [
      { type: 'country', country_code: 'es' },
      { type: 'country', country_code: 'fr' },
      { type: 'country', country_code: 'ro' },
    ],
  });
  const serviceZone = fulfillment_set.service_zones?.find((sz) => sz.name === 'EU Zone');
  console.log('[seed] Created service zone:', serviceZone.id);
  return serviceZone;
}

async function ensureShippingOption(token, _region, serviceZone, profile) {
  const list = await adminGet(token, '/shipping-options?limit=50');
  const existing = list?.shipping_options?.find((o) => o.name === 'Standard Shipping');
  if (existing) {
    console.log('[seed] Shipping option already exists:', existing.id);
    return existing;
  }
  const zoneId = serviceZone?.id || list?.shipping_options?.[0]?.service_zone_id;
  if (!zoneId) {
    throw new Error('No service zone available to create shipping option');
  }
  const { shipping_option } = await adminPost(token, '/shipping-options', {
    name: 'Standard Shipping',
    price_type: 'flat',
    type: {
      label: 'Standard',
      code: 'standard',
      description: 'Standard shipping',
    },
    service_zone_id: zoneId,
    shipping_profile_id: profile.id,
    provider_id: 'manual_manual',
    prices: [
      { currency_code: 'eur', amount: 500 },
    ],
    rules: [],
  });
  console.log('[seed] Created shipping option:', shipping_option.id);
  return shipping_option;
}

async function ensureSalesChannel(token) {
  const list = await adminGet(token, '/sales-channels?limit=10');
  const existing = list?.sales_channels?.find((sc) => sc.is_default) || list?.sales_channels?.[0];
  if (existing) {
    console.log('[seed] Sales channel already exists:', existing.id);
    return existing;
  }
  const { sales_channel } = await adminPost(token, '/sales-channels', {
    name: 'Default Channel',
    description: 'Default sales channel',
    is_default: true,
  });
  console.log('[seed] Created sales channel:', sales_channel.id);
  return sales_channel;
}

async function ensureProduct(token, profile, salesChannel, location) {
  const list = await adminGet(token, '/products?handle=launch-readiness-treat&limit=1');
  const existing = list?.products?.[0];
  if (existing) {
    console.log('[seed] Product already exists:', existing.id);
    return existing;
  }
  const { product } = await adminPost(token, '/products', {
    title: 'Launch Readiness Treat',
    handle: 'launch-readiness-treat',
    description: 'Test product for launch-readiness verification.',
    status: 'published',
    discountable: true,
    shipping_profile_id: profile.id,
    sales_channels: [{ id: salesChannel.id }],
    options: [{ title: 'Size', values: ['100g'] }],
    variants: [
      {
        title: '100g',
        sku: 'LRT-100',
        prices: [{ currency_code: 'eur', amount: 1000 }],
        options: { Size: '100g' },
        manage_inventory: true,
      },
    ],
  });
  console.log('[seed] Created product:', product.id);

  // Ensure the variant has an inventory item with quantity 100 at the location.
  const variant = product.variants?.[0];
  if (variant && location) {
    let inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id;
    if (!inventoryItemId) {
      // Auto-created inventory items are not returned by default; reload the variant.
      const variantDetail = await adminGet(token, `/products/${product.id}/variants/${variant.id}?fields=*inventory_items`);
      inventoryItemId = variantDetail?.variant?.inventory_items?.[0]?.inventory_item_id;
    }
    if (!inventoryItemId) {
      // Fall back to creating and linking a new inventory item.
      try {
        const { inventory_item } = await adminPost(token, '/inventory-items', {
          sku: 'LRT-100',
          title: 'Launch Readiness Treat - 100g',
        });
        inventoryItemId = inventory_item.id;
        console.log('[seed] Created inventory item:', inventoryItemId);
      } catch (err) {
        const alreadyExists = err.message?.toLowerCase().includes('already exists');
        if (!alreadyExists) throw err;
        const list = await adminGet(token, '/inventory-items?sku=LRT-100&limit=1');
        inventoryItemId = list?.inventory_items?.[0]?.id;
        if (!inventoryItemId) throw err;
        console.log('[seed] Inventory item already exists:', inventoryItemId);
      }
      await adminPost(token, `/products/${product.id}/variants/${variant.id}/inventory-items`, {
        inventory_item_id: inventoryItemId,
        required_quantity: 1,
      });
      console.log('[seed] Linked inventory item to variant');
    } else {
      console.log('[seed] Variant already has inventory item:', inventoryItemId);
    }

    await adminPost(token, `/inventory-items/${inventoryItemId}/location-levels`, {
      location_id: location.id,
      stocked_quantity: 100,
    });
    console.log('[seed] Set inventory level to 100 at location');
  }

  return product;
}

async function ensurePromotion(token) {
  const list = await adminGet(token, '/promotions?code=TEST10&limit=1');
  const existing = list?.promotions?.[0];
  if (existing) {
    console.log('[seed] Promotion already exists:', existing.id);
    return existing;
  }
  const { promotion } = await adminPost(token, '/promotions', {
    code: 'TEST10',
    type: 'standard',
    is_automatic: false,
    status: 'active',
    application_method: {
      description: '10% off test promotion',
      value: 10,
      currency_code: 'eur',
      type: 'percentage',
      target_type: 'items',
      allocation: 'across',
    },
  });
  console.log('[seed] Created promotion:', promotion.id);
  return promotion;
}

async function ensurePublishableKey(token) {
  const list = await adminGet(token, '/api-keys?type=publishable&limit=10');
  const existing = list?.api_keys?.[0];
  if (existing) {
    console.log('[seed] Publishable API key already exists:', existing.id);
    return existing;
  }
  const { api_key } = await adminPost(token, '/api-keys', {
    title: 'Storefront Local',
    type: 'publishable',
  });
  console.log('[seed] Created publishable API key:', api_key.id);
  return api_key;
}

async function main() {
  console.log('[seed] Waiting for backend at', BASE_URL);
  await waitForBackend();
  console.log('[seed] Logging in as', ADMIN_EMAIL);
  const token = await login();

  const region = await ensureRegion(token);
  const { taxRegion, taxRate } = await ensureTaxRegionAndRate(token, region);
  const profile = await ensureShippingProfile(token);
  const salesChannel = await ensureSalesChannel(token);
  const location = await ensureStockLocation(token, salesChannel);
  const fulfillmentSet = await ensureFulfillmentSet(token, location);
  const serviceZone = await ensureServiceZone(token, fulfillmentSet);
  const shippingOption = await ensureShippingOption(token, region, serviceZone, profile);
  const product = await ensureProduct(token, profile, salesChannel, location);
  const promotion = await ensurePromotion(token);
  const apiKey = await ensurePublishableKey(token);

  const variant = product.variants?.[0];
  console.log('\n[seed] ✅ Launch-readiness seed complete');
  console.log({
    regionId: region.id,
    taxRegionId: taxRegion.id,
    taxRateId: taxRate.id,
    stockLocationId: location.id,
    salesChannelId: salesChannel.id,
    fulfillmentSetId: fulfillmentSet.id,
    serviceZoneId: serviceZone?.id,
    shippingOptionId: shippingOption.id,
    productId: product.id,
    variantId: variant?.id,
    promotionCode: promotion.code,
    publishableApiKey: apiKey.token,
  });
}

main().catch((err) => {
  console.error('[seed] ❌', err.message);
  process.exit(1);
});
