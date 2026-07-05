import { defineLink } from '@medusajs/framework/utils'
import CustomerModule from '@medusajs/medusa/customer'
import PaymentModule from '@medusajs/medusa/payment'

export default defineLink(
  CustomerModule.linkable.customer,
  {
    linkable: PaymentModule.linkable.accountHolder,
    isList: false,
  }
)
