import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

type SubscriptionDTO = {
  id: string
  interval: string
  period: number
  failed_payment_count?: number
}

type SubscriptionPaymentFailedEmailProps = {
  subscription: SubscriptionDTO
  customer_name: string
  failure: {
    message: string
    code?: string
    decline_code?: string
  }
  update_payment_url?: string
}

function SubscriptionPaymentFailedEmailComponent({
  subscription,
  customer_name,
  failure,
  update_payment_url,
}: SubscriptionPaymentFailedEmailProps) {
  const frequency =
    subscription.period === 1
      ? subscription.interval
      : `every ${subscription.period} ${subscription.interval.replace('ly', '')}s`

  return (
    <Tailwind>
      <Html className="font-sans bg-gray-100">
        <Head />
        <Preview>Ruby here 🐾 your subscription payment needs attention</Preview>
        <Body className="bg-white my-10 mx-auto w-full max-w-2xl">
          <Section className="bg-[#103472] text-white px-6 py-4">
            <Text className="text-lg font-semibold m-0">Naricitas</Text>
          </Section>

          <Container className="p-6">
            <Heading className="text-2xl font-bold text-center text-gray-800">
              Hey {customer_name}, your subscription renewal didn't go through.
            </Heading>
            <Text className="text-center text-gray-600 mt-2">
              Ruby here 🐾 — I tried to renew your {frequency} subscription, but the
              payment on file couldn't be processed. No worries, your goodies are waiting;
              we just need a fresh payment method.
            </Text>
          </Container>

          <Container className="px-6">
            <Section className="bg-gray-50 p-6 rounded-lg">
              <Text className="m-0 text-gray-700">
                <strong>What happened:</strong> {failure.message}
                {failure.decline_code && (
                  <span className="text-gray-500"> ({failure.decline_code})</span>
                )}
              </Text>
              <Text className="m-0 mt-2 text-gray-700">
                <strong>Attempt number:</strong> {subscription.failed_payment_count || 1}
              </Text>
            </Section>

            {update_payment_url && (
              <Section className="mt-6 text-center">
                <a
                  href={update_payment_url}
                  className="inline-block bg-[#103472] text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Update payment method
                </a>
              </Section>
            )}

            <Text className="text-gray-600 mt-6">
              Need a hand? Just reply to this email or reach out at
              support@naricitas.shop and I'll fetch a human to help.
            </Text>
          </Container>

          <Section className="bg-gray-50 p-6 mt-10">
            <Text className="text-center text-gray-500 text-sm mt-4">
              Questions? Just reply to this email — I'll fetch a human, or contact us at
              support@naricitas.shop.
            </Text>
            <Text className="text-center text-gray-400 text-xs mt-4">
              © {new Date().getFullYear()} Naricitas. All rights reserved.
            </Text>
          </Section>
        </Body>
      </Html>
    </Tailwind>
  )
}

export const subscriptionPaymentFailedEmail = (props: SubscriptionPaymentFailedEmailProps) => (
  <SubscriptionPaymentFailedEmailComponent {...props} />
)
