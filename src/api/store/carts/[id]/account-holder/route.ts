import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const paymentModuleService = req.scope.resolve(Modules.PAYMENT)

  const { data: [cart] } = await query.graph({
    entity: 'cart',
    fields: ['id', 'email', 'customer_id', 'shipping_address.*', 'billing_address.*'],
    filters: { id: req.params.id },
  })

  if (!cart?.email) {
    return res.status(400).json({ message: 'Cart email is required' })
  }

  const { data: existing } = await query.graph({
    entity: 'account_holder',
    fields: ['id', 'provider_id', 'external_id', 'email', 'data'],
    filters: {
      email: cart.email,
      provider_id: 'pp_stripe_stripe',
    },
  })

  if (existing.length) {
    return res.json({ account_holder: existing[0] })
  }

  const address = cart.billing_address || cart.shipping_address || undefined

  const accountHolder = await paymentModuleService.createAccountHolder({
    provider_id: 'pp_stripe_stripe',
    context: {
      customer: {
        id: cart.customer_id || '',
        email: cart.email,
        phone: address?.phone || undefined,
        billing_address: address
          ? {
              address_1: address.address_1,
              address_2: address.address_2 || undefined,
              city: address.city,
              province: address.province || undefined,
              postal_code: address.postal_code,
              country_code: address.country_code,
            }
          : undefined,
      },
    },
  })

  res.status(201).json({ account_holder: accountHolder })
}
