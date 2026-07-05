import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

// NOTE: @medusajs/types@2.13.6 ships without dist/index.d.ts, so importing
// `BigNumberValue`/`CustomerDTO`/`OrderDTO` from `@medusajs/framework/types`
// fails to resolve at compile time. Use minimal structural types instead.
type BigNumberValue = number | string | { toString(): string } | null | undefined

type CustomerDTO = {
  first_name?: string | null
}

type OrderItemDTO = {
  id: string
  thumbnail?: string | null
  product_title?: string | null
  variant_title?: string | null
  total: BigNumberValue
}

type OrderDTO = {
  display_id: number | string
  currency_code: string
  items?: OrderItemDTO[]
  item_total: BigNumberValue
  total: BigNumberValue
  shipping_address?: {
    first_name?: string | null
  }
}

type OrderPlacedEmailProps = {
  order: OrderDTO & {
    customer: CustomerDTO
  }
}

function OrderPlacedEmailComponent({ order }: OrderPlacedEmailProps) {
  const formatter = new Intl.NumberFormat([], {
    style: 'currency',
    currencyDisplay: 'narrowSymbol',
    currency: order.currency_code,
  })

  const formatPrice = (price: BigNumberValue) => {
    if (typeof price === 'number') {
      return formatter.format(price)
    }

    if (typeof price === 'string') {
      return formatter.format(parseFloat(price))
    }

    return price?.toString() || ''
  }

  const firstName = order.customer?.first_name || order.shipping_address?.first_name || 'friend'

  return (
    <Tailwind>
      <Html className="font-sans bg-gray-100">
        <Head />
        <Preview>Ruby here 🐾 your order just landed on my desk (I sniffed it, it's good)</Preview>
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
              Woof, {firstName}! Your order is officially in.
            </Heading>
            <Text className="text-center text-gray-600 mt-2">
              Ruby here 🐾 — I personally sniffed every item in this parcel and gave it my seal of
              approval (four paws up). My humans at Naricitas are already packing it up, and I'll
              come tell you the second it's on its way.
            </Text>
          </Container>

          <Container className="px-6">
            <Heading className="text-xl font-semibold text-gray-800 mb-4">
              What's in your parcel
            </Heading>
            <Text className="text-sm m-0 my-2 text-gray-500">Order ID: #{order.display_id}</Text>
            {order.items?.map((item) => (
              <Section key={item.id} className="border-b border-gray-200 py-4">
                <Row>
                  <Column className="w-1/4">
                    <Img
                      src={item.thumbnail ?? ''}
                      alt={item.product_title ?? ''}
                      className="rounded-lg"
                      width="80"
                    />
                  </Column>
                  <Column className="w-2/4 pl-4">
                    <Text className="m-0 font-medium">{item.product_title}</Text>
                    <Text className="m-0 text-gray-500 text-sm">{item.variant_title}</Text>
                  </Column>
                  <Column className="w-1/4 text-right">
                    <Text className="m-0">{formatPrice(item.total)}</Text>
                  </Column>
                </Row>
              </Section>
            ))}

            <Section className="mt-8">
              <Row className="text-gray-600">
                <Column className="w-1/2">
                  <Text className="m-0">Subtotal</Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text className="m-0">{formatPrice(order.item_total)}</Text>
                </Column>
              </Row>
              <Row className="text-gray-800 font-semibold mt-2">
                <Column className="w-1/2">
                  <Text className="m-0">Total</Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text className="m-0">{formatPrice(order.total)}</Text>
                </Column>
              </Row>
            </Section>
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

export const orderPlacedEmail = (props: OrderPlacedEmailProps) => (
  <OrderPlacedEmailComponent {...props} />
)
