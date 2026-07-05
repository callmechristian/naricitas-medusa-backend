import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const customerService = container.resolve(Modules.CUSTOMER)
  const paymentService = container.resolve(Modules.PAYMENT)

  const [customer] = await customerService.listCustomers({ id: data.id })
  if (!customer) return

  try {
    await paymentService.createAccountHolder({
      provider_id: 'pp_stripe_stripe',
      context: {
        customer,
      },
    })
  } catch (err: any) {
    // If an account holder already exists for this email, ignore.
    if (err?.message?.includes('already exists')) {
      return
    }
    throw err
  }
}

export const config: SubscriberConfig = {
  event: 'customer.created',
}
