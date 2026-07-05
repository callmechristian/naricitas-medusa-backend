import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const paymentModuleService = req.scope.resolve(Modules.PAYMENT)

  const { data: [cart] } = await query.graph({
    entity: 'cart',
    fields: ['id', 'email', 'customer_id', 'currency_code', 'payment_collection.id', 'payment_collection.payment_sessions.*'],
    filters: { id: req.params.id },
  })

  if (!cart?.email) {
    return res.status(400).json({ message: 'Cart email is required' })
  }

  // Ensure payment collection exists and matches the cart total.
  let paymentCollection = cart.payment_collection
  if (!paymentCollection) {
    const [collection] = await paymentModuleService.createPaymentCollections([
      {
        currency_code: cart.currency_code,
        amount: cart.total,
      },
    ])
    paymentCollection = collection
  } else if (paymentCollection.amount !== cart.total) {
    paymentCollection = await paymentModuleService.updatePaymentCollections(
      paymentCollection.id,
      { amount: cart.total }
    )
  }

  // Ensure Stripe account holder exists for the cart's email.
  const { data: existingHolders } = await query.graph({
    entity: 'account_holder',
    fields: ['id', 'provider_id', 'external_id', 'email', 'data'],
    filters: {
      email: cart.email,
      provider_id: 'pp_stripe_stripe',
    },
  })

  let accountHolder = existingHolders[0]
  if (!accountHolder) {
    accountHolder = await paymentModuleService.createAccountHolder({
      provider_id: 'pp_stripe_stripe',
      context: {
        customer: {
          id: cart.customer_id || '',
          email: cart.email,
        },
      },
    })
  }

  // Delete any existing Stripe session so we always get a fresh PaymentIntent with the customer attached.
  const existingSession = paymentCollection.payment_sessions?.find(
    (s: any) => s.provider_id === 'pp_stripe_stripe'
  )
  if (existingSession) {
    await paymentModuleService.deletePaymentSession(existingSession.id)
  }

  const paymentSession = await paymentModuleService.createPaymentSession(
    paymentCollection.id,
    {
      provider_id: 'pp_stripe_stripe',
      currency_code: paymentCollection.currency_code || cart.currency_code,
      amount: paymentCollection.amount || cart.total,
      data: {
        setup_future_usage: 'off_session',
      },
      context: {
        account_holder: accountHolder,
      },
      metadata: {},
    }
  )

  res.json({ payment_session: paymentSession, account_holder: accountHolder })
}
