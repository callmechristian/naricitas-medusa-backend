import { model } from '@medusajs/framework/utils'

export const SupportTask = model.define('support_task', {
  id: model.id().primaryKey(),
  title: model.text(),
  summary: model.text().nullable(),
  status: model
    .enum(['open', 'in_progress', 'waiting_customer', 'resolved'])
    .default('open')
    .index(),
  priority: model
    .enum(['low', 'normal', 'high', 'urgent'])
    .default('normal'),
  category: model.enum([
    'refund',
    'exchange',
    'delivery',
    'subscription',
    'vip_followup',
  ]),
  channel: model.text().nullable(),
  due_at: model.dateTime().nullable(),
  snoozed_until: model.dateTime().nullable(),
  resolved_at: model.dateTime().nullable(),
  resolution_note: model.text().nullable(),
  customer_id: model.text().nullable(),
  customer_name: model.text().nullable(),
  customer_email: model.text().nullable(),
  source_type: model.text().nullable(),
  source_id: model.text().nullable(),
  assignee_admin_user_id: model.text().nullable().index(),
  tags: model.json().nullable(),
  metadata: model.json().nullable(),
  created_by_admin_id: model.text().nullable(),
  updated_by_admin_id: model.text().nullable(),
})
