import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import subscriptionCustomerLink from '../../../../../links/subscription-customer'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerId = req.params.customerId

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
    fields: ['*', 'orders.*', 'customer.*'],
    filters: {
      id: subscriptionIds,
    },
  })

  res.json({ subscriptions })
}
