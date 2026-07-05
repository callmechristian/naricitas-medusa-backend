import {
  MedusaError,
  Modules,
  ContainerRegistrationKeys,
} from '@medusajs/framework/utils'
import { AccountHolderDTO, PaymentMethodDTO } from '@medusajs/framework/types'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

export interface GetPaymentMethodStepInput {
  email?: string
}

// Since we know we are using Stripe, we can get the correct creation date from their data.
const getLatestPaymentMethod = (paymentMethods: PaymentMethodDTO[]) => {
  return paymentMethods.sort(
    (a, b) =>
      ((b.data?.created as number) ?? 0) - ((a.data?.created as number) ?? 0)
  )[0]
}

export const getPaymentMethodStep = createStep(
  'get-payment-method',
  async ({ email }: GetPaymentMethodStepInput, { container }) => {
    if (!email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No customer email found while retrieving payment method'
      )
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [accountHolder],
    } = await query.graph({
      entity: 'account_holder',
      fields: ['id', 'provider_id', 'external_id', 'email', 'data'],
      filters: {
        email,
        provider_id: 'pp_stripe_stripe',
      },
    })

    if (!accountHolder) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No Stripe account holder found for the customer while retrieving payment method'
      )
    }

    const paymentModuleService = container.resolve(Modules.PAYMENT)

    const paymentMethods = await paymentModuleService.listPaymentMethods({
      // you can change to other payment provider
      provider_id: 'pp_stripe_stripe',
      context: {
        account_holder: accountHolder as AccountHolderDTO,
      },
    })

    if (!paymentMethods.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'At least one saved payment method is required for performing a payment'
      )
    }

    const paymentMethodToUse = getLatestPaymentMethod(paymentMethods)

    return new StepResponse(
      {
        paymentMethod: paymentMethodToUse,
        accountHolder: accountHolder as AccountHolderDTO,
      },
      accountHolder as AccountHolderDTO
    )
  }
)
