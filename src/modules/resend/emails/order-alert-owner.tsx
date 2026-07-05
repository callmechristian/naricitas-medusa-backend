import { Column, Container, Head, Heading, Html, Link, Preview, Row, Section, Tailwind, Text } from '@react-email/components'

type OrderAlertOwnerEmailProps = {
  order: {
    id: string
    display_id: number | string
    email?: string | null
    currency_code: string
    total: number | string | { toString(): string } | null | undefined
    items?: { id: string; product_title?: string | null; quantity?: number }[]
    customer?: { first_name?: string | null; last_name?: string | null } | null
    shipping_address?: { first_name?: string | null; last_name?: string | null } | null
  }
  admin_url?: string
}

function OrderAlertOwnerEmailComponent({ order, admin_url }: OrderAlertOwnerEmailProps) {
  const formatter = new Intl.NumberFormat([], {
    style: 'currency',
    currencyDisplay: 'narrowSymbol',
    currency: order.currency_code,
  })

  const formatPrice = (price: OrderAlertOwnerEmailProps['order']['total']) => {
    if (typeof price === 'number') return formatter.format(price)
    if (typeof price === 'string') return formatter.format(parseFloat(price))
    return price?.toString() || ''
  }

  const customerName =
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') ||
    [order.shipping_address?.first_name, order.shipping_address?.last_name].filter(Boolean).join(' ') ||
    'Unknown customer'

  const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0
  const orderUrl = admin_url ? `${admin_url}/orders/${order.id}` : undefined

  return (
    <Tailwind>
      <Html className="font-sans bg-gray-100">
        <Head />
        <Preview>New order #{order.display_id} — {formatPrice(order.total)}</Preview>
        <Container className="bg-white my-6 mx-auto w-full max-w-md rounded-lg p-6">
          <Section className="bg-[#103472] text-white px-4 py-3 rounded-t-lg -mt-6 -mx-6 mb-4">
            <Text className="text-base font-semibold m-0">🐾 New order placed</Text>
          </Section>
          <Row>
            <Column>
              <Text className="text-2xl font-bold m-0 text-gray-800">#{order.display_id}</Text>
              <Text className="text-lg text-gray-700 m-0 mt-1">{formatPrice(order.total)}</Text>
            </Column>
          </Row>
          <Section className="mt-4">
            <Text className="text-sm text-gray-600 m-0">Customer: {customerName}</Text>
            {order.email ? <Text className="text-sm text-gray-600 m-0">Email: {order.email}</Text> : null}
            <Text className="text-sm text-gray-600 m-0">Items: {itemCount}</Text>
          </Section>
          {orderUrl ? (
            <Section className="mt-6 text-center">
              <Link
                href={orderUrl}
                className="bg-[#103472] rounded text-white text-sm font-semibold no-underline text-center px-5 py-3 inline-block"
              >
                View order
              </Link>
            </Section>
          ) : null}
        </Container>
      </Html>
    </Tailwind>
  )
}

export const orderAlertOwnerEmail = (props: OrderAlertOwnerEmailProps) => (
  <OrderAlertOwnerEmailComponent {...props} />
)
