import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SUBSCRIPTION_MODULE } from '../../../../../modules/subscriptions'
import SubscriptionModuleService from '../../../../../modules/subscriptions/service'

function authorize(req: MedusaRequest): boolean {
  const secret = process.env.NARICITAS_WEB_SECRET
  if (!secret) return false
  const header = (req as any).headers?.['x-naricitas-secret']
  return header === secret
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorize(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const subscriptionModuleService: SubscriptionModuleService =
    req.scope.resolve(SUBSCRIPTION_MODULE)

  const [subscription] = await subscriptionModuleService.cancelSubscriptions(req.params.id)

  res.json({ subscription })
}
