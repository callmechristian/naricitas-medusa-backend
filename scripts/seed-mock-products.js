#!/usr/bin/env node
/**
 * Seed Naricitas mock products into Medusa.
 *
 * Reads data/mock_products.csv from the naricitas-web project and creates
 * products, variants, prices, and inventory levels in the local Medusa backend.
 *
 * Usage:
 *   node scripts/seed-mock-products.js [path/to/mock_products.csv]
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@naricitas.shop';
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || 'Admin123!';
const DEFAULT_CSV = path.join(__dirname, '../../naricitas-web/data/mock_products.csv');
const CSV_PATH = process.argv[2] || DEFAULT_CSV;

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

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

async function ensureShippingProfile(token) {
  const list = await adminGet(token, '/shipping-profiles?limit=10');
  const existing = list?.shipping_profiles?.[0];
  if (existing) return existing;
  const { shipping_profile } = await adminPost(token, '/shipping-profiles', {
    name: 'Default Shipping Profile',
    type: 'default',
  });
  return shipping_profile;
}

async function ensureSalesChannel(token) {
  const list = await adminGet(token, '/sales-channels?limit=10');
  const existing = list?.sales_channels?.find((sc) => sc.is_default) || list?.sales_channels?.[0];
  if (existing) return existing;
  const { sales_channel } = await adminPost(token, '/sales-channels', {
    name: 'Default Channel',
    description: 'Default sales channel',
    is_default: true,
  });
  return sales_channel;
}

async function ensureStockLocation(token) {
  const list = await adminGet(token, '/stock-locations?limit=10');
  const existing = list?.stock_locations?.[0];
  if (existing) return existing;
  const { stock_location } = await adminPost(token, '/stock-locations', {
    name: 'Naricitas Warehouse',
    address: {
      address_1: 'Calle Mayor 1',
      city: 'Madrid',
      country_code: 'ES',
      postal_code: '28001',
    },
  });
  return stock_location;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createProduct(token, row, profile, salesChannel, location) {
  const id = row.id || slugify(row.name);
  const priceCents = Math.round(Number.parseFloat(row.price) * 100);
  const stock = Number.parseInt(row.stock, 10) || 0;
  const title = row.name;
  const handle = id;
  const description = row.description || '';
  const category = row.category || 'General';

  let images = [];
  try {
    const parsed = JSON.parse(row.images || '[]');
    images = Array.isArray(parsed) ? parsed : [];
  } catch {
    images = (row.images || '').split(',').map((t) => t.trim()).filter(Boolean);
  }

  const list = await adminGet(token, `/products?handle=${handle}&limit=1`);
  const existing = list?.products?.[0];
  if (existing) {
    console.log(`[seed] Product already exists: ${title} (${existing.id})`);
    return existing;
  }

  const { product } = await adminPost(token, '/products', {
    title,
    handle,
    description,
    status: 'published',
    discountable: true,
    shipping_profile_id: profile.id,
    sales_channels: [{ id: salesChannel.id }],
    options: [{ title: 'Default', values: ['One Size'] }],
    variants: [
      {
        title: 'One Size',
        sku: id,
        prices: [{ currency_code: 'eur', amount: priceCents }],
        options: { Default: 'One Size' },
        manage_inventory: true,
      },
    ],
  });

  console.log(`[seed] Created product: ${title} (${product.id})`);

  // Set images if any.
  if (images.length > 0) {
    try {
      await adminPost(token, `/products/${product.id}/images`, {
        images: images.map((url) => ({ url })),
      });
    } catch (err) {
      console.warn(`[seed] Could not set images for ${title}:`, err.message);
    }
  }

  // Ensure inventory item exists and set stock.
  const variant = product.variants?.[0];
  if (variant && location) {
    let inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id;
    if (!inventoryItemId) {
      const variantDetail = await adminGet(token, `/products/${product.id}/variants/${variant.id}?fields=*inventory_items`);
      inventoryItemId = variantDetail?.variant?.inventory_items?.[0]?.inventory_item_id;
    }

    if (!inventoryItemId) {
      try {
        const { inventory_item } = await adminPost(token, '/inventory-items', {
          sku: id,
          title: `${title} - One Size`,
        });
        inventoryItemId = inventory_item.id;
      } catch (err) {
        const alreadyExists = err.message?.toLowerCase().includes('already exists');
        if (!alreadyExists) throw err;
        const list = await adminGet(token, `/inventory-items?sku=${id}&limit=1`);
        inventoryItemId = list?.inventory_items?.[0]?.id;
        if (!inventoryItemId) throw err;
      }

      await adminPost(token, `/products/${product.id}/variants/${variant.id}/inventory-items`, {
        inventory_item_id: inventoryItemId,
        required_quantity: 1,
      });
    }

    await adminPost(token, `/inventory-items/${inventoryItemId}/location-levels`, {
      location_id: location.id,
      stocked_quantity: stock,
    });
  }

  return product;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found: ${CSV_PATH}`);
  }

  console.log('[seed] Waiting for backend at', BASE_URL);
  await waitForBackend();
  console.log('[seed] Logging in as', ADMIN_EMAIL);
  const token = await login();

  const profile = await ensureShippingProfile(token);
  const salesChannel = await ensureSalesChannel(token);
  const location = await ensureStockLocation(token);

  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCsv(csvText);
  console.log(`[seed] Found ${rows.length} products in ${CSV_PATH}`);

  let created = 0;
  let existing = 0;
  for (const row of rows) {
    try {
      const product = await createProduct(token, row, profile, salesChannel, location);
      if (product._wasExisting) {
        existing++;
      } else {
        created++;
      }
    } catch (err) {
      console.error(`[seed] Failed to create product "${row.name}":`, err.message);
    }
    // Small delay to avoid hammering the API.
    await sleep(100);
  }

  console.log('\n[seed] ✅ Mock product seed complete');
  console.log(`Created: ${created}, Existing: ${existing}, Total attempted: ${rows.length}`);
}

main().catch((err) => {
  console.error('[seed] ❌', err.message);
  process.exit(1);
});
