import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SUBSCRIPTION_MODULE } from '../../../../../modules/subscriptions'
import SubscriptionModuleService from '../../../../../modules/subscriptions/service'
import createSubscriptionOrderWorkflow from '../../../../../workflows/create-subscription-order'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const subscriptionModuleService: SubscriptionModuleService =
    req.scope.resolve(SUBSCRIPTION_MODULE)
  const logger = req.scope.resolve('logger')

  const subscription = await subscriptionModuleService.retrieveSubscription(
    req.params.id
  )

  try {
    const { result } = await createSubscriptionOrderWorkflow(req.scope).run({
      input: {
        subscription,
      },
    })

    logger.info(
      `Manual renewal created order ${result.order?.id} for subscription ${subscription.id}`
    )

    res.json({
      subscription,
      order: result.order || null,
    })
  } catch (e) {
    logger.error(`Manual renewal failed for subscription ${subscription.id}`, e)
    throw e
  }
}
