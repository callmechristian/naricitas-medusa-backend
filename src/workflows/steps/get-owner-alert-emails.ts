import { Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

// NOTE: @medusajs/types@2.13.6 ships without dist/index.d.ts (see notes in
// src/modules/resend/service.ts). Minimal structural type used here instead.
type StoreDTO = {
  metadata?: Record<string, unknown> | null
}

type StoreModuleService = {
  listStores: () => Promise<StoreDTO[]>
}

export const getOwnerAlertEmailsStep = createStep(
  'get-owner-alert-emails',
  async (_input: void, { container }) => {
    const storeModuleService = container.resolve<StoreModuleService>(Modules.STORE)
    const [store] = await storeModuleService.listStores()

    const configured = typeof store?.metadata?.order_alert_emails === 'string'
      ? (store.metadata.order_alert_emails as string)
      : ''

    const emails = (configured || process.env.OWNER_ALERT_EMAILS || '')
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)

    return new StepResponse(emails)
  }
)
