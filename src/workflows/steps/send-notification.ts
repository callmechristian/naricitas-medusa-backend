import { Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

// NOTE: @medusajs/types@2.13.6 ships without dist/index.d.ts, so importing
// `CreateNotificationDTO` from `@medusajs/framework/types` fails to resolve
// at compile time. Use a minimal structural type instead (skipLibCheck is on).
type CreateNotificationDTO = {
  to: string
  channel: string
  template: string
  data?: Record<string, unknown>
}

export const sendNotificationStep = createStep(
  'send-notification',
  async (data: CreateNotificationDTO[], { container }) => {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    const notification = await notificationModuleService.createNotifications(data)
    return new StepResponse(notification)
  }
)
