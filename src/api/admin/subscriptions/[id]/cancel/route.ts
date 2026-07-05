import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SUBSCRIPTION_MODULE } from '../../../../../modules/subscriptions'
import SubscriptionModuleService from '../../../../../modules/subscriptions/service'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const subscriptionModuleService: SubscriptionModuleService =
    req.scope.resolve(SUBSCRIPTION_MODULE)

  const [subscription] = await subscriptionModuleService.cancelSubscriptions(
    req.params.id
  )

  res.json({ subscription })
}
