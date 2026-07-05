import { createWorkflow, transform, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'
import { sendNotificationStep } from './steps/send-notification'
import { getOwnerAlertEmailsStep } from './steps/get-owner-alert-emails'

type WorkflowInput = {
  id: string
}

export const sendOrderConfirmationWorkflow = createWorkflow(
  'send-order-confirmation',
  ({ id }: WorkflowInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: 'order',
      fields: [
        'id',
        'display_id',
        'email',
        'currency_code',
        'total',
        'items.*',
        'shipping_address.*',
        'billing_address.*',
        'shipping_methods.*',
        'customer.*',
        'total',
        'subtotal',
        'discount_total',
        'shipping_total',
        'tax_total',
        'item_subtotal',
        'item_total',
        'item_tax_total',
      ],
      filters: {
        id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const ownerAlertEmails = getOwnerAlertEmailsStep()

    // sendNotificationStep can only be invoked once per workflow definition
    // (each step invocation must have a unique name), so the customer
    // order-placed email and the owner alert emails are combined into a
    // single array and sent via one step call.
    const notifications = transform(
      { orders, ownerAlertEmails },
      ({ orders, ownerAlertEmails }) => {
        const list: {
          to: string
          channel: string
          template: string
          data: Record<string, unknown>
        }[] = []

        if (orders[0].email) {
          list.push({
            to: orders[0].email as string,
            channel: 'email',
            template: 'order-placed',
            data: {
              order: orders[0],
            },
          })
        }

        for (const to of ownerAlertEmails) {
          list.push({
            to,
            channel: 'email',
            template: 'order-alert-owner',
            data: {
              order: orders[0],
              admin_url: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/app` : undefined,
            },
          })
        }

        return list
      }
    )

    const notification = when({ notifications }, ({ notifications }) => {
      return notifications.length > 0
    }).then(() => {
      return sendNotificationStep(notifications)
    })

    return new WorkflowResponse({
      notification,
    })
  }
)
