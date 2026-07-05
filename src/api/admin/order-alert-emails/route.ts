import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

// NOTE: @medusajs/types@2.13.6 ships without dist/index.d.ts (see notes in
// src/modules/resend/service.ts). Minimal structural type used here instead.
type StoreDTO = {
  id: string
  metadata?: Record<string, unknown> | null
}

type StoreModuleService = {
  listStores: () => Promise<StoreDTO[]>
  updateStores: (id: string, data: { metadata: Record<string, unknown> }) => Promise<unknown>
}

function parseEmails(raw: unknown): string[] {
  const value = typeof raw === 'string' ? raw : ''
  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const storeModuleService = req.scope.resolve<StoreModuleService>(Modules.STORE)
  const [store] = await storeModuleService.listStores()

  res.json({ emails: parseEmails(store?.metadata?.order_alert_emails) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const body = req.body as { emails?: unknown }
  const emails = Array.isArray(body?.emails)
    ? body.emails.map((email) => String(email).trim()).filter(Boolean)
    : []

  const storeModuleService = req.scope.resolve<StoreModuleService>(Modules.STORE)
  const [store] = await storeModuleService.listStores()

  if (!store) {
    res.status(404).json({ error: 'Store not found' })
    return
  }

  await storeModuleService.updateStores(store.id, {
    metadata: { ...(store.metadata || {}), order_alert_emails: emails.join(',') },
  })

  res.json({ emails })
}
