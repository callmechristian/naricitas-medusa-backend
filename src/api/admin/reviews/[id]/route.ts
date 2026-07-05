import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { REVIEWS_MODULE } from '../../../../modules/reviews'
import type ReviewsModuleService from '../../../../modules/reviews/service'

// POST /admin/reviews/:id — moderate (hide/flag/publish) and/or reply.

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<ReviewsModuleService>(REVIEWS_MODULE)
  const body = req.body as Record<string, unknown>

  const patch: Record<string, unknown> = {}
  if (body.moderation_status) {
    patch.moderation_status = body.moderation_status
    patch.hidden_reason = body.hidden_reason || null
    patch.moderated_at = new Date()
  }
  if (typeof body.reply_body === 'string') {
    patch.reply_body = body.reply_body
    patch.reply_author_name = body.reply_author_name || 'Naricitas'
    patch.replied_at = new Date()
  }

  const result = await service
    .updateReviews({ selector: { id: req.params.id }, data: patch })
    .catch(() => null)
  const review = Array.isArray(result) ? result[0] : result
  if (!review) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ review })
}
