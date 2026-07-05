import { MedusaService } from '@medusajs/framework/utils'
import moment from 'moment'
import Subscription from './models/subscription'
import {
  CreateSubscriptionData,
  SubscriptionData,
  SubscriptionInterval,
  SubscriptionStatus,
} from './types'

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
    const nextOrderDate = moment(last_order_date).add(
      period,
      interval === SubscriptionInterval.MONTHLY ? 'month' : 'year'
    )
    const expirationMomentDate = moment(expiration_date)

    return nextOrderDate.isAfter(expirationMomentDate)
      ? null
      : nextOrderDate.toDate()
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
    return moment(subscription_date)
      .add(period, interval === SubscriptionInterval.MONTHLY ? 'month' : 'year')
      .toDate()
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

  async recordPaymentFailure(
    id: string,
    reason: string
  ): Promise<SubscriptionData> {
    const subscription = await this.retrieveSubscription(id)

    return await this.updateSubscriptions({
      id,
      failed_payment_count: (subscription.failed_payment_count || 0) + 1,
      last_failure_at: new Date(),
      last_failure_reason: reason,
      status: SubscriptionStatus.FAILED,
    })
  }

  async resetPaymentFailure(id: string): Promise<SubscriptionData> {
    return await this.updateSubscriptions({
      id,
      failed_payment_count: 0,
      last_failure_at: null,
      last_failure_reason: null,
    })
  }
}

export default SubscriptionModuleService
