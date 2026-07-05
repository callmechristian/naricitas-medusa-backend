import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { Modules, PaymentSessionStatus } from '@medusajs/framework/utils'
import {
  PaymentCollectionDTO,
  PaymentMethodDTO,
  CartWorkflowDTO,
  CustomerDTO,
  AccountHolderDTO,
} from '@medusajs/framework/types'

type ProcessSubscriptionPaymentStepInput = {
  payment_collection: PaymentCollectionDTO
  cart: CartWorkflowDTO
  defaultPaymentMethod: PaymentMethodDTO
  accountHolder: AccountHolderDTO
}

export type PaymentSuccessResult = {
  success: true
  payment: {
    id: string
    amount: number
  }
}

export type PaymentFailureResult = {
  success: false
  error: {
    message: string
    code?: string
    decline_code?: string
  }
}

export type PaymentProcessResult = PaymentSuccessResult | PaymentFailureResult

const processSubscriptionPaymentStep = createStep<
  ProcessSubscriptionPaymentStepInput,
  PaymentProcessResult,
  PaymentProcessResult
>(
  'process-subscription-payment',
  async (
    { payment_collection, cart, defaultPaymentMethod, accountHolder }: ProcessSubscriptionPaymentStepInput,
    { container }
  ) => {
    const paymentModule = container.resolve(Modules.PAYMENT)
    const logger = container.resolve('logger')

    try {
      const customer = cart?.customer as CustomerDTO | undefined

      const paymentSession = await paymentModule.createPaymentSession(
        payment_collection.id,
        {
          provider_id: 'pp_stripe_stripe',
          currency_code: payment_collection.currency_code,
          amount: payment_collection.amount,
          data: {
            payment_method: defaultPaymentMethod.id,
            off_session: true,
            confirm: true,
            capture_method: 'automatic',
          },
          context: {
            customer,
            account_holder: accountHolder,
          },
          metadata: {},
        }
      )

      const payment = await paymentModule.authorizePaymentSession(
        paymentSession.id,
        paymentSession.context || {}
      )

      const paymentSessionAfterAuthorize = await paymentModule.retrievePaymentSession(
        paymentSession.id,
        { relations: ['payment'] }
      )

      if (
        paymentSessionAfterAuthorize.status === PaymentSessionStatus.REQUIRES_MORE
      ) {
        throw new Error('Payment requires additional authentication')
      }

      if (
        paymentSessionAfterAuthorize.status !== PaymentSessionStatus.AUTHORIZED ||
        !payment
      ) {
        throw new Error('Payment authorization failed')
      }

      const capturedPayment = await paymentModule.capturePayment({
        payment_id: payment.id,
        amount: Number(payment.amount),
      })

      return new StepResponse({
        success: true,
        payment: {
          id: capturedPayment.id,
          amount: Number(capturedPayment.amount),
        },
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const raw = (error as any)?.raw || error

      logger.error(
        `Subscription payment failed for collection ${payment_collection.id}: ${err.message}`,
        error
      )

      return new StepResponse({
        success: false,
        error: {
          message: err.message,
          code: (raw as any)?.code,
          decline_code: (raw as any)?.decline_code,
        },
      })
    }
  }
)

export default processSubscriptionPaymentStep
