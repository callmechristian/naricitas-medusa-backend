import { Container, Heading, Table, Text, Button, Badge } from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

type SubscriptionOrder = {
  id: string
  created_at: string
}

type SubscriptionDetail = {
  id: string
  status: string
  interval: string
  period: number
  subscription_date: string
  expiration_date: string
  next_order_date?: string | null
  failed_payment_count?: number
  last_failure_at?: string | null
  last_failure_reason?: string | null
  orders?: SubscriptionOrder[]
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

const SubscriptionPage = () => {
  const { id } = useParams()
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadSubscription = () => {
    if (!id) return
    setLoading(true)
    fetch(`/admin/subscriptions/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setSubscription(data.subscription))
      .catch(() => setError('Failed to load subscription.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSubscription()
  }, [id])

  const runAction = async (action: 'cancel' | 'expire') => {
    if (!id) return
    setActionLoading(action)
    try {
      const res = await fetch(`/admin/subscriptions/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`Failed to ${action} subscription.`)
      }
      const data = await res.json()
      setSubscription(data.subscription)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const canManage = subscription && ['active', 'failed'].includes(subscription.status)

  return (
    <Container className="p-6">
      {loading && <Text>Loading...</Text>}
      {error && <Text className="text-ui-fg-error">{error}</Text>}
      {subscription && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <Heading level="h1">Subscription #{subscription.id}</Heading>
              <Text className="text-ui-fg-subtle mt-1">
                {subscription.customer?.email || 'No customer email'}
              </Text>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  isLoading={actionLoading === 'expire'}
                  disabled={!!actionLoading}
                  onClick={() => runAction('expire')}
                >
                  Mark expired
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  isLoading={actionLoading === 'cancel'}
                  disabled={!!actionLoading}
                  onClick={() => runAction('cancel')}
                >
                  Cancel subscription
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-ui-bg-subtle p-3 rounded">
              <Text className="text-ui-fg-subtle text-sm">Status</Text>
              <Badge color={STATUS_COLOR[subscription.status] || 'grey'} className="mt-1">
                {getStatusTitle(subscription.status)}
              </Badge>
            </div>
            <div className="bg-ui-bg-subtle p-3 rounded">
              <Text className="text-ui-fg-subtle text-sm">Frequency</Text>
              <Text className="font-medium mt-1">
                {subscription.period === 1
                  ? subscription.interval
                  : `Every ${subscription.period} ${subscription.interval.replace('ly', '')}s`}
              </Text>
            </div>
            <div className="bg-ui-bg-subtle p-3 rounded">
              <Text className="text-ui-fg-subtle text-sm">Next renewal</Text>
              <Text className="font-medium mt-1">
                {subscription.next_order_date
                  ? new Date(subscription.next_order_date).toLocaleString()
                  : '-'}
              </Text>
            </div>
            <div className="bg-ui-bg-subtle p-3 rounded">
              <Text className="text-ui-fg-subtle text-sm">Expires</Text>
              <Text className="font-medium mt-1">
                {new Date(subscription.expiration_date).toLocaleString()}
              </Text>
            </div>
          </div>

          {subscription.status === 'failed' && (
            <div className="bg-ui-bg-error p-4 rounded mt-4">
              <Text className="text-ui-fg-error font-medium">
                Payment failed {subscription.failed_payment_count || 1} time
                {(subscription.failed_payment_count || 1) > 1 ? 's' : ''}.
              </Text>
              {subscription.last_failure_reason && (
                <Text className="text-ui-fg-error text-sm mt-1">
                  Reason: {subscription.last_failure_reason}
                </Text>
              )}
              {subscription.last_failure_at && (
                <Text className="text-ui-fg-error text-sm mt-1">
                  Last failure: {new Date(subscription.last_failure_at).toLocaleString()}
                </Text>
              )}
            </div>
          )}

          <Heading level="h2" className="mt-8 mb-4">
            Orders
          </Heading>
          <Table>
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
