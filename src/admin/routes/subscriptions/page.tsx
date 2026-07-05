import { defineRouteConfig } from '@medusajs/admin-sdk'
import { ClockSolid } from '@medusajs/icons'
import { Badge, Container, Heading, Table, Text } from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Subscription = {
  id: string
  status: string
  interval: string
  subscription_date: string
  expiration_date: string
  metadata?: Record<string, unknown> | null
  customer?: { email?: string | null } | null
}

const STATUS_COLOR: Record<string, 'green' | 'orange' | 'red' | 'grey'> = {
  active: 'green',
  canceled: 'orange',
  failed: 'red',
  expired: 'grey',
}

function getStatusTitle(status: string) {
  return status.charAt(0).toUpperCase() + status.substring(1)
}

const SubscriptionsPage = () => {
  const navigate = useNavigate()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/admin/subscriptions?limit=200', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setSubscriptions(data.subscriptions || []))
      .catch(() => setError('Failed to load subscriptions.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container className="p-6">
      <Heading level="h1">Subscriptions</Heading>
      <Text className="text-ui-fg-subtle mt-2">
        Recurring purchases and their renewal status.
      </Text>

      {error && <Text className="text-ui-fg-error mt-4">{error}</Text>}
      {loading && <Text className="mt-4">Loading...</Text>}

      {!loading && !error && (
        <Table className="mt-4">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>#</Table.HeaderCell>
              <Table.HeaderCell>Main Order</Table.HeaderCell>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Subscription Date</Table.HeaderCell>
              <Table.HeaderCell>Expiry Date</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {subscriptions.map((subscription) => (
              <Table.Row
                key={subscription.id}
                className="cursor-pointer"
                onClick={() => navigate(`/subscriptions/${subscription.id}`)}
              >
                <Table.Cell>{subscription.id}</Table.Cell>
                <Table.Cell>
                  {(subscription.metadata?.main_order_id as string) || '-'}
                </Table.Cell>
                <Table.Cell>{subscription.customer?.email || '-'}</Table.Cell>
                <Table.Cell>
                  {new Date(subscription.subscription_date).toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                  {new Date(subscription.expiration_date).toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLOR[subscription.status] || 'grey'}>
                    {getStatusTitle(subscription.status)}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: 'Subscriptions',
  icon: ClockSolid,
})

export default SubscriptionsPage
