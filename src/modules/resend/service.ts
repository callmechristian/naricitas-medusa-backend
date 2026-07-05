import { AbstractNotificationProviderService, MedusaError } from '@medusajs/framework/utils'
import { CreateEmailOptions, Resend } from 'resend'
import { orderPlacedEmail } from './emails/order-placed'
import { passwordResetEmail } from './emails/password-reset'
import { orderAlertOwnerEmail } from './emails/order-alert-owner'

// NOTE: @medusajs/types@2.13.6 ships without dist/index.d.ts, so importing
// `Logger`/`NotificationTypes` from `@medusajs/framework/types` fails to
// resolve at compile time even though it works fine at runtime. We define
// minimal structural types locally instead (skipLibCheck is enabled, so this
// does not affect type safety of the base class methods we override).
type Logger = {
  info: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

type ProviderSendNotificationDTO = {
  to: string
  channel: string
  template: string
  data: Record<string, unknown>
}

type ProviderSendNotificationResultsDTO = {
  id?: string
}

type ResendOptions = {
  api_key: string
  from: string
  html_templates?: Record<string, {
    subject?: string
    content: string
  }>
}

type InjectedDependencies = {
  logger: Logger
}

enum Templates {
  ORDER_PLACED = 'order-placed',
  PASSWORD_RESET = 'password-reset',
  ORDER_ALERT_OWNER = 'order-alert-owner',
}

const templates: { [key in Templates]?: (props: unknown) => React.ReactNode } = {
  [Templates.ORDER_PLACED]: orderPlacedEmail,
  [Templates.PASSWORD_RESET]: passwordResetEmail,
  [Templates.ORDER_ALERT_OWNER]: orderAlertOwnerEmail,
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = 'notification-resend'
  private resendClient: Resend
  private options: ResendOptions
  private logger: Logger

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  static validateOptions(options: Record<any, any>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `api_key` is required in the provider's options."
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `from` is required in the provider's options."
      )
    }
  }

  private getTemplate(template: Templates) {
    if (this.options.html_templates?.[template]) {
      return this.options.html_templates[template].content
    }
    const allowedTemplates = Object.keys(templates)

    if (!allowedTemplates.includes(template)) {
      return null
    }

    return templates[template]
  }

  private getTemplateSubject(template: Templates) {
    if (this.options.html_templates?.[template]?.subject) {
      return this.options.html_templates[template].subject
    }
    switch (template) {
      case Templates.ORDER_PLACED:
        return "Ruby here 🐾 your order is confirmed!"
      case Templates.PASSWORD_RESET:
        return "Ruby here 🐾 let's reset your password"
      case Templates.ORDER_ALERT_OWNER:
        return '🐾 New order placed'
      default:
        return 'New Email'
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = this.getTemplate(notification.template as Templates)

    if (!template) {
      this.logger.error(
        `Couldn't find an email template for ${notification.template}. The valid options are ${Object.values(Templates)}`
      )
      return {}
    }

    const commonOptions = {
      from: this.options.from,
      to: [notification.to],
      subject: this.getTemplateSubject(notification.template as Templates),
    }

    let emailOptions: CreateEmailOptions
    if (typeof template === 'string') {
      emailOptions = {
        ...commonOptions,
        html: template,
      }
    } else {
      emailOptions = {
        ...commonOptions,
        react: template(notification.data),
      }
    }

    const { data, error } = await this.resendClient.emails.send(emailOptions)

    if (error || !data) {
      if (error) {
        this.logger.error('Failed to send email', error)
      } else {
        this.logger.error('Failed to send email: unknown error')
      }
      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
