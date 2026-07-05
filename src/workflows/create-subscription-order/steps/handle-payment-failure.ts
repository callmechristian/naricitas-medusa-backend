import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { Modules } from '@medusajs/framework/utils'
import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions'
import SubscriptionModuleService from '../../../modules/subscriptions/service'
import { PaymentFailureResult } from './process-subscription-payment'

type HandlePaymentFailureStepInput = {
  subscription_id: string
  customer_email?: string | null
  customer_name?: string | null
  failure: PaymentFailureResult['error']
}

const handlePaymentFailureStep = createStep(
  'handle-subscription-payment-failure',
  async (
    { subscription_id, customer_email, customer_name, failure }: HandlePaymentFailureStepInput,
    { container }
  ) => {
    const subscriptionModuleService: SubscriptionModuleService =
      container.resolve(SUBSCRIPTION_MODULE)
    const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    const logger = container.resolve('logger')

    const subscription = await subscriptionModuleService.recordPaymentFailure(
      subscription_id,
      failure.message
    )

    if (customer_email) {
      try {
        await notificationModuleService.createNotifications({
          to: customer_email,
          channel: 'email',
          template: 'subscription-payment-failed',
          data: {
            subscription,
            customer_name: customer_name || 'friend',
            failure,
            update_payment_url: process.env.STOREFRONT_URL
              ? `${process.env.STOREFRONT_URL}/account/subscriptions`
              : undefined,
          },
        })
      } catch (e) {
        logger.error(
          `Failed to send subscription payment failure notification for ${subscription_id}`,
          e
        )
      }
    }

    return new StepResponse({ subscription })
  }
)

export default handlePaymentFailureStep
