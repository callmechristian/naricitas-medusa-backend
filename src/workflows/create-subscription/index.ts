import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'
import {
  useQueryGraphStep,
  completeCartWorkflow,
  createRemoteLinkStep,
  acquireLockStep,
  releaseLockStep,
} from '@medusajs/medusa/core-flows'
import subscriptionOrderLink from '../../links/subscription-order'
import { SubscriptionInterval } from '../../modules/subscriptions/types'
import createSubscriptionStep from './steps/create-subscription'

type WorkflowInput = {
  cart_id: string
  subscription_data: {
    interval: SubscriptionInterval
    period: number
  }
}

const createSubscriptionWorkflow = createWorkflow(
  'create-subscription',
  (input: WorkflowInput) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    const { id } = completeCartWorkflow.runAsStep({
      input: {
        id: input.cart_id,
      },
    })

    const { data: orders } = useQueryGraphStep({
      entity: 'order',
      fields: [
        'id',
        'display_id',
        'status',
        'email',
        'currency_code',
        'customer_id',
        'region_id',
        'total',
        'subtotal',
        'discount_total',
        'shipping_total',
        'tax_total',
        'items.*',
        'shipping_address.*',
        'billing_address.*',
      ],
      filters: {
        id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const { data: existingLinks } = useQueryGraphStep({
      entity: subscriptionOrderLink.entryPoint,
      fields: ['subscription.id'],
      filters: { order_id: orders[0].id },
    }).config({ name: 'retrieve-existing-links' })

    const subscription = when(
      'create-subscription-condition',
      { existingLinks },
      (data) => data.existingLinks.length === 0
    ).then(() => {
      const { subscription, linkDefs } = createSubscriptionStep({
        cart_id: input.cart_id,
        order_id: orders[0].id,
        customer_id: orders[0].customer_id!,
        subscription_data: input.subscription_data,
      })

      createRemoteLinkStep(linkDefs)

      return subscription
    })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse({
      subscription: subscription,
      order: orders[0],
    })
  }
)

export default createSubscriptionWorkflow
