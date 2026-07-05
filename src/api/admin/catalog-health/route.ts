import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

// GET /admin/catalog-health
//
// Read-only aggregate over Medusa's own Product module — no new data model.
// Replaces naricitas-manager's /admin/api/products/health screen.
//
// Returns:
//   {
//     totals: { all, active, draft, out_of_stock, low_stock },
//     missing: { images },
//   }

const LOW_STOCK_THRESHOLD = 5
const PAGE_SIZE = 200
const MAX_PRODUCTS = 5000 // safety cap; revisit if the catalog grows past this

type ProductRow = {
  id: string
  status: string
  thumbnail?: string | null
  variants?: { inventory_quantity?: number | null }[]
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const totals = { all: 0, active: 0, draft: 0, out_of_stock: 0, low_stock: 0 }
  let missingImages = 0

  let skip = 0
  for (;;) {
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id', 'status', 'thumbnail', 'variants.inventory_quantity'],
      pagination: { skip, take: PAGE_SIZE },
    })

    const rows = (products || []) as ProductRow[]
    if (!rows.length) break

    for (const product of rows) {
      totals.all += 1
      if (product.status === 'published') totals.active += 1
      if (product.status === 'draft') totals.draft += 1
      if (!product.thumbnail) missingImages += 1

      const variants = product.variants || []
      const stock = variants.reduce((sum, v) => sum + (Number(v.inventory_quantity) || 0), 0)
      if (stock <= 0) totals.out_of_stock += 1
      else if (stock <= LOW_STOCK_THRESHOLD) totals.low_stock += 1
    }

    if (rows.length < PAGE_SIZE || skip + PAGE_SIZE >= MAX_PRODUCTS) break
    skip += PAGE_SIZE
  }

  res.json({ totals, missing: { images: missingImages } })
}
