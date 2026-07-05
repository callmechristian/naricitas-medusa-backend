import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { REVIEWS_MODULE } from '../../../modules/reviews'
import type ReviewsModuleService from '../../../modules/reviews/service'

// GET /admin/reviews?moderation_status=pending&product_id=...&limit=100&offset=0
//
// Returns reviews joined with a `product_title` lookup (via Query) so the
// admin UI doesn't need a second round-trip per row.

const STATUSES = new Set(['published', 'pending', 'hidden', 'flagged'])

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<ReviewsModuleService>(REVIEWS_MODULE)
  const sp = req.query as Record<string, string | undefined>

  const filters: Record<string, unknown> = {}
  if (sp.moderation_status && sp.moderation_status !== 'any' && STATUSES.has(sp.moderation_status)) {
    filters.moderation_status = sp.moderation_status
  }
  if (sp.product_id) filters.product_id = sp.product_id

  const limit = Math.min(500, Math.max(1, parseInt(sp.limit || '100', 10) || 100))
  const offset = Math.max(0, parseInt(sp.offset || '0', 10) || 0)

  const [reviews, count] = await service.listAndCountReviews(filters, {
    take: limit,
    skip: offset,
    order: { created_at: 'DESC' },
  })

  const productIds = [...new Set(reviews.map((r) => r.product_id))]
  let titlesById: Record<string, string> = {}
  if (productIds.length) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id', 'title'],
      filters: { id: productIds },
    })
    titlesById = Object.fromEntries((products || []).map((p: any) => [p.id, p.title]))
  }

  res.json({
    reviews: reviews.map((r) => ({ ...r, product_title: titlesById[r.product_id] || null })),
    count,
    limit,
    offset,
  })
}
