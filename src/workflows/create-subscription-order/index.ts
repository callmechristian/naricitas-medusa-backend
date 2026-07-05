import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'
import {
  useQueryGraphStep,
  createPaymentCollectionsStep,
  createRemoteLinkStep,
} from '@medusajs/medusa/core-flows'
import { SubscriptionData } from '../../modules/subscriptions/types'
import createSubscriptionOrderStep, {
  CreateSubscriptionOrderStepInput,
} from './steps/create-subscription-order'
import { getPaymentMethodStep } from './steps/get-payment-method'
import processSubscriptionPaymentStep, {
  PaymentFailureResult,
} from './steps/process-subscription-payment'
import handlePaymentFailureStep from './steps/handle-payment-failure'
import updateSubscriptionStep from './steps/update-subscription'

type WorkflowInput = {
  subscription: SubscriptionData
}

const createSubscriptionOrderWorkflow = createWorkflow(
  'create-subscription-order',
  (input: WorkflowInput) => {
    const { data: subscriptions } = useQueryGraphStep({
      entity: 'subscription',
      fields: [
        '*',
        'cart.id',
        'cart.email',
        'cart.currency_code',
        'cart.region_id',
        'cart.customer_id',
        'cart.sales_channel_id',
        'cart.items.*',
        'cart.items.tax_lines.*',
        'cart.items.adjustments.*',
        'cart.shipping_address.*',
        'cart.billing_address.*',
        'cart.shipping_methods.*',
        'cart.shipping_methods.tax_lines.*',
        'cart.shipping_methods.adjustments.*',
        'cart.payment_collection.*',
        'cart.payment_collection.payment_sessions.*',
      ],
      filters: {
        id: input.subscription.id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const paymentCollectionData = transform({ subscriptions }, (data) => {
      const cart = data.subscriptions[0].cart
      return {
        currency_code: cart?.currency_code || '',
        amount: cart?.payment_collection?.amount || 0,
        metadata: cart?.payment_collection?.metadata || undefined,
      }
    })

    const payment_collection = createPaymentCollectionsStep([
      paymentCollectionData,
    ])[0]

    const defaultPaymentMethodAndHolder = getPaymentMethodStep({
      email: subscriptions[0].cart.email,
    })

    const { paymentMethod: defaultPaymentMethod, accountHolder } = transform(
      { defaultPaymentMethodAndHolder },
      (data) => ({
        paymentMethod: data.defaultPaymentMethodAndHolder.paymentMethod,
        accountHolder: data.defaultPaymentMethodAndHolder.accountHolder,
      })
    )

    const paymentResult = processSubscriptionPaymentStep({
      payment_collection,
      cart: subscriptions[0].cart,
      defaultPaymentMethod,
      accountHolder,
    })

    const successPayload = transform(
      { subscriptions, payment_collection },
      (data) => ({
        subscription: data.subscriptions[0] as unknown as SubscriptionData,
        cart: data.subscriptions[0].cart,
        payment_collection,
      })
    )

    const order = when(
      'subscription-payment-success',
      { paymentResult, successPayload },
      (data) => data.paymentResult.success
    ).then(() => {
      const { order, linkDefs } = createSubscriptionOrderStep({
        subscription: successPayload.subscription,
        cart: successPayload.cart,
        payment_collection: successPayload.payment_collection,
      } as unknown as CreateSubscriptionOrderStepInput)

      createRemoteLinkStep(linkDefs)

      updateSubscriptionStep({
        subscription_id: input.subscription.id,
      })

      return order
    })

    when(
      'subscription-payment-failure',
      { paymentResult, subscriptions },
      (data) => !data.paymentResult.success
    ).then(() => {
      handlePaymentFailureStep({
        subscription_id: input.subscription.id,
        customer_email: subscriptions[0].cart?.email,
        customer_name:
          subscriptions[0].cart?.customer?.first_name ||
          subscriptions[0].cart?.shipping_address?.first_name,
        failure: (paymentResult as unknown as PaymentFailureResult).error,
      })
    })

    return new WorkflowResponse({
      order,
    })
  }
)

export default createSubscriptionOrderWorkflow
