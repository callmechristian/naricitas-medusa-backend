import { model } from '@medusajs/framework/utils'

export const Review = model.define('review', {
  id: model.id().primaryKey(),
  product_id: model.text().index(),
  rating: model.number(),
  title: model.text().nullable(),
  body: model.text().nullable(),
  reviewer_name: model.text().nullable(),
  moderation_status: model
    .enum(['published', 'pending', 'hidden', 'flagged'])
    .default('published')
    .index(),
  hidden_reason: model.text().nullable(),
  reply_body: model.text().nullable(),
  reply_author_name: model.text().nullable(),
  replied_at: model.dateTime().nullable(),
  report_count: model.number().default(0),
  moderated_by_admin_id: model.text().nullable(),
  moderated_at: model.dateTime().nullable(),
})
