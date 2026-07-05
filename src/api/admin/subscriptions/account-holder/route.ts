import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { customer_id, email } = req.body as { customer_id?: string; email?: string }
  if (!email) {
    return res.status(400).json({ message: 'email is required' })
  }

  const paymentModuleService = req.scope.resolve(Modules.PAYMENT)

  const accountHolder = await paymentModuleService.createAccountHolder({
    provider_id: 'pp_stripe_stripe',
    context: {
      customer: {
        id: customer_id || '',
        email,
      },
    },
  })

  res.status(201).json({ account_holder: accountHolder })
}
