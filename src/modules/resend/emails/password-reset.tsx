import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

type PasswordResetEmailProps = {
  reset_url: string
  email?: string
}

function PasswordResetEmailComponent({ reset_url, email }: PasswordResetEmailProps) {
  return (
    <Tailwind>
      <Html className="font-sans bg-gray-100">
        <Head />
        <Preview>Ruby here 🐾 let's get you back in — new password link inside</Preview>
        <Body className="bg-white my-10 mx-auto w-full max-w-2xl">
          <Section className="bg-[#103472] text-white px-6 py-4">
            <Row>
              <Column>
                <Text className="text-lg font-semibold m-0">Naricitas</Text>
              </Column>
              <Column align="right">
                <Text className="text-sm m-0 text-blue-100">🌭 a note from Ruby</Text>
              </Column>
            </Row>
          </Section>

          <Container className="p-6">
            <Heading className="text-2xl font-bold text-center text-gray-800">
              Woof! Let's get you a new password.
            </Heading>
            <Text className="text-center text-gray-600 mt-2">
              Ruby here 🐾 — {email ? `${email}, ` : ''}I heard you need a fresh password. I fetched
              this link myself, so click the button below and you'll be back in in two shakes of a
              tail.
            </Text>
          </Container>

          <Section className="text-center my-2">
            <Button
              className="bg-[#103472] rounded text-white text-sm font-semibold no-underline text-center px-6 py-3"
              href={reset_url}
            >
              Reset My Password
            </Button>
          </Section>

          <Container className="px-6 mt-6">
            <Text className="text-center text-gray-500 text-sm">
              Or copy and paste this link into your browser:
            </Text>
            <Link href={reset_url} className="text-blue-700 no-underline text-sm break-all block text-center">
              {reset_url}
            </Link>
          </Container>

          <Container className="px-6 mt-6">
            <Text className="text-center text-gray-500 text-xs">
              This link is only good for a little while, so don't dawdle. Didn't ask for a new
              password? No worries — just ignore this email and your old one stays put.
            </Text>
          </Container>

          <Section className="bg-gray-50 p-6 mt-10">
            <Text className="text-center text-gray-600 text-sm italic">
              Wags and wiggles,<br />Ruby 🌭🐾 (and the humans at Naricitas)
            </Text>
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

export const passwordResetEmail = (props: PasswordResetEmailProps) => (
  <PasswordResetEmailComponent {...props} />
)
