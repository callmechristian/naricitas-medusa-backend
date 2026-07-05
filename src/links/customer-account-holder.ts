import { defineLink, Modules } from '@medusajs/framework/utils'
import CustomerModule from '@medusajs/medusa/customer'

export default defineLink(
  CustomerModule.linkable.customer,
  {
    linkable: {
      serviceName: Modules.PAYMENT,
      entity: 'AccountHolder',
      field: 'account_holder',
      linkable: 'account_holder_id',
      primaryKey: 'id',
    },
    isList: false,
  }
)
