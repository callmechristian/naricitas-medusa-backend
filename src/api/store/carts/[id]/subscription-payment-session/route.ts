import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createPaymentCollectionForCartWorkflow } from '@medusajs/medusa/core-flows'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
    const logger = req.scope.resolve('logger')

    const { data: [cart] } = await query.graph({
      entity: 'cart',
      fields: [
        'id',
        'email',
        'customer_id',
        'currency_code',
        'total',
        'payment_collection.id',
        'payment_collection.amount',
        'payment_collection.currency_code',
        'payment_collection.payment_sessions.*',
      ],
      filters: { id: req.params.id },
    })

    if (!cart?.email) {
      return res.status(400).json({ message: 'Cart email is required' })
    }

    // Ensure payment collection exists and is linked to the cart.
    let paymentCollection = cart.payment_collection
    const cartTotal = Number(cart.total)
    if (!paymentCollection) {
      const { result: collection } = await createPaymentCollectionForCartWorkflow(
        req.scope
      ).run({
        input: { cart_id: cart.id },
      })
      paymentCollection = collection
    } else {
      const collectionAmount = Number(paymentCollection.amount)
      if (collectionAmount !== cartTotal) {
        logger.info(
          `Updating payment collection ${paymentCollection.id} amount from ${collectionAmount} to ${cartTotal}`
        )
        paymentCollection = await paymentModuleService.updatePaymentCollections(
          paymentCollection.id,
          { amount: cartTotal }
        )
      }
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
        amount: Number(paymentCollection.amount) || cartTotal,
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
  } catch (err: any) {
    const logger = req.scope.resolve('logger')
    logger.error(
      `subscription-payment-session failed for cart ${req.params.id}: ${err?.message}`,
      err
    )
    res.status(500).json({ code: 'unknown_error', message: err?.message || 'Unknown error' })
  }
}
