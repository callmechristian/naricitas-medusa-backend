import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

type NotificationModuleService = {
  createNotifications: (data: Record<string, unknown>) => Promise<unknown>
}

type ConfigModule = {
  admin?: {
    backendUrl?: string
    path?: string
  }
}

export default async function resetPasswordTokenHandler({
  event: {
    data: { entity_id: email, token, actor_type },
  },
  container,
}: SubscriberArgs<{ entity_id: string; token: string; actor_type: string }>) {
  const notificationModuleService = container.resolve<NotificationModuleService>(
    Modules.NOTIFICATION
  )
  const config = container.resolve<ConfigModule>('configModule')

  let urlPrefix = ''

  if (actor_type === 'customer') {
    urlPrefix = process.env.STOREFRONT_URL || 'https://naricitas.shop'
  } else {
    const backendUrl =
      config.admin?.backendUrl && config.admin.backendUrl !== '/'
        ? config.admin.backendUrl
        : process.env.BACKEND_URL || 'http://localhost:9000'
    const adminPath = config.admin?.path || '/app'
    urlPrefix = `${backendUrl}${adminPath}`
  }

  await notificationModuleService.createNotifications({
    to: email,
    channel: 'email',
    template: 'password-reset',
    data: {
      reset_url: `${urlPrefix}/reset-password?token=${token}&email=${email}`,
      email,
    },
  })
}

export const config: SubscriberConfig = {
  event: 'auth.password_reset',
}
