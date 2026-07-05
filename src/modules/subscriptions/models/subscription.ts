import { model } from '@medusajs/framework/utils'
import { SubscriptionInterval, SubscriptionStatus } from '../types'

const Subscription = model.define('subscription', {
  id: model.id().primaryKey(),
  status: model.enum(SubscriptionStatus).default(SubscriptionStatus.ACTIVE),
  interval: model.enum(SubscriptionInterval),
  period: model.number(),
  subscription_date: model.dateTime(),
  last_order_date: model.dateTime(),
  next_order_date: model.dateTime().index().nullable(),
  expiration_date: model.dateTime().index(),
  failed_payment_count: model.number().default(0),
  last_failure_at: model.dateTime().nullable(),
  last_failure_reason: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Subscription
