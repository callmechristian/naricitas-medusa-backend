import { MedusaContainer } from '@medusajs/framework/types'
import moment from 'moment'
import { SUBSCRIPTION_MODULE } from '../modules/subscriptions'
import SubscriptionModuleService from '../modules/subscriptions/service'
import { SubscriptionStatus } from '../modules/subscriptions/types'

export default async function expireSubscriptionOrdersJob(
  container: MedusaContainer
) {
  const subscriptionModuleService: SubscriptionModuleService =
    container.resolve(SUBSCRIPTION_MODULE)
  const logger = container.resolve('logger')

  let page = 0
  const limit = 20
  let pagesCount = 0

  do {
    const beginningToday = moment(new Date())
      .set({
        second: 0,
        minute: 0,
        hour: 0,
      })
      .toDate()
    const endToday = moment(new Date())
      .set({
        second: 59,
        minute: 59,
        hour: 23,
      })
      .toDate()

    const [subscriptions, count] = await subscriptionModuleService.listAndCountSubscriptions(
      {
        expiration_date: {
          $gte: beginningToday,
          $lte: endToday,
        },
        status: SubscriptionStatus.ACTIVE,
      },
      {
        skip: page * limit,
        take: limit,
      }
    )

    const subscriptionIds = subscriptions.map((subscription) => subscription.id)

    if (subscriptionIds.length) {
      await subscriptionModuleService.expireSubscription(subscriptionIds)

      logger.info(`Expired ${subscriptionIds}.`)
    }

    if (!pagesCount) {
      pagesCount = count / limit
    }

    page++
  } while (page < pagesCount - 1)
}

export const config = {
  name: 'expire-subscriptions',
  schedule: '0 0 * * *', // Every day at midnight
}
