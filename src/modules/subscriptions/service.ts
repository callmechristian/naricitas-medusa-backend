import { MedusaService } from '@medusajs/framework/utils'
import Subscription from './models/subscription'
import {
  CreateSubscriptionData,
  SubscriptionData,
  SubscriptionInterval,
  SubscriptionStatus,
} from './types'

/** Adds `period` months/years (per `interval`) to `date`, returning a new Date. */
function addInterval(date: Date, interval: SubscriptionInterval, period: number): Date {
  const result = new Date(date)
  if (interval === SubscriptionInterval.MONTHLY) {
    result.setMonth(result.getMonth() + period)
  } else {
    result.setFullYear(result.getFullYear() + period)
  }
  return result
}

class SubscriptionModuleService extends MedusaService({
  Subscription,
}) {
  getNextOrderDate({
    last_order_date,
    expiration_date,
    interval,
    period,
  }: {
    last_order_date: Date
    expiration_date: Date
    interval: SubscriptionInterval
    period: number
  }): Date | null {
    const nextOrderDate = addInterval(last_order_date, interval, period)
    return nextOrderDate > expiration_date ? null : nextOrderDate
  }

  getExpirationDate({
    subscription_date,
    interval,
    period,
  }: {
    subscription_date: Date
    interval: SubscriptionInterval
    period: number
  }): Date {
    return addInterval(subscription_date, interval, period)
  }

  // @ts-expect-error narrower override of the generated bulk-create method
  async createSubscriptions(
    data: CreateSubscriptionData | CreateSubscriptionData[]
  ): Promise<SubscriptionData[]> {
    const input = Array.isArray(data) ? data : [data]

    const subscriptions = await Promise.all(
      input.map(async (subscription) => {
        const subscriptionDate = subscription.subscription_date || new Date()
        const expirationDate = this.getExpirationDate({
          subscription_date: subscriptionDate,
          interval: subscription.interval,
          period: subscription.period,
        })

        return await super.createSubscriptions({
          ...subscription,
          subscription_date: subscriptionDate,
          last_order_date: subscriptionDate,
          next_order_date: this.getNextOrderDate({
            last_order_date: subscriptionDate,
            expiration_date: expirationDate,
            interval: subscription.interval,
            period: subscription.period,
          }),
          expiration_date: expirationDate,
        })
      })
    )

    return subscriptions
  }

  async recordNewSubscriptionOrder(id: string) {
    const subscription = await this.retrieveSubscription(id)
    const orderDate = new Date()

    return await this.updateSubscriptions({
      id,
      last_order_date: orderDate,
      next_order_date: this.getNextOrderDate({
        last_order_date: orderDate,
        expiration_date: subscription.expiration_date,
        interval: subscription.interval as SubscriptionInterval,
        period: subscription.period,
      }),
    })
  }

  async expireSubscription(id: string | string[]): Promise<SubscriptionData[]> {
    const input = Array.isArray(id) ? id : [id]

    return await this.updateSubscriptions({
      selector: { id: input },
      data: {
        next_order_date: null,
        status: SubscriptionStatus.EXPIRED,
      },
    })
  }

  async cancelSubscriptions(id: string | string[]): Promise<SubscriptionData[]> {
    const input = Array.isArray(id) ? id : [id]

    return await this.updateSubscriptions({
      selector: { id: input },
      data: {
        next_order_date: null,
        status: SubscriptionStatus.CANCELED,
      },
    })
  }
}

export default SubscriptionModuleService
