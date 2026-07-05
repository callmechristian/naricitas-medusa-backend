import { Container, Heading, Table, Text } from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

type SubscriptionOrder = {
  id: string
  created_at: string
}

type SubscriptionDetail = {
  id: string
  status: string
  orders?: SubscriptionOrder[]
}

const SubscriptionPage = () => {
  const { id } = useParams()
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/admin/subscriptions/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setSubscription(data.subscription))
      .catch(() => setError('Failed to load subscription.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <Container className="p-6">
      {loading && <Text>Loading...</Text>}
      {error && <Text className="text-ui-fg-error">{error}</Text>}
      {subscription && (
        <>
          <Heading level="h1">Orders of Subscription #{subscription.id}</Heading>
          <Table className="mt-4">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>#</Table.HeaderCell>
                <Table.HeaderCell>Date</Table.HeaderCell>
                <Table.HeaderCell>View Order</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {subscription.orders?.map((order) => (
                <Table.Row key={order.id}>
                  <Table.Cell>{order.id}</Table.Cell>
                  <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                  <Table.Cell>
                    <Link to={`/orders/${order.id}`}>View Order</Link>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </>
      )}
    </Container>
  )
}

export default SubscriptionPage
