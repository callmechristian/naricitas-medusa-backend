import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import subscriptionCustomerLink from '../../../../links/subscription-customer'

function authorize(req: MedusaRequest): boolean {
  const secret = process.env.NARICITAS_WEB_SECRET
  if (!secret) return false
  const header = (req as any).headers?.['x-naricitas-secret']
  return header === secret
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorize(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerId = req.query.customer_id as string | undefined

  if (!customerId) {
    return res.status(400).json({ error: 'customer_id is required' })
  }

  const { data: links } = await query.graph({
    entity: subscriptionCustomerLink.entryPoint,
    fields: ['subscription_id'],
    filters: {
      customer_id: customerId,
    },
  })

  const subscriptionIds = links.map((link: any) => link.subscription_id).filter(Boolean)

  if (subscriptionIds.length === 0) {
    return res.json({ subscriptions: [] })
  }

  const { data: subscriptions } = await query.graph({
    entity: 'subscription',
    fields: ['*', 'orders.*'],
    filters: {
      id: subscriptionIds,
    },
  })

  res.json({ subscriptions })
}
