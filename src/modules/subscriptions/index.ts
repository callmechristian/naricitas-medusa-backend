import SubscriptionModuleService from './service'
import { Module } from '@medusajs/framework/utils'

export const SUBSCRIPTION_MODULE = 'subscriptions'

export default Module(SUBSCRIPTION_MODULE, {
  service: SubscriptionModuleService,
})
