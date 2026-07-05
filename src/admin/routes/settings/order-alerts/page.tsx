import { defineRouteConfig } from '@medusajs/admin-sdk'
import { Button, Container, Heading, Input, Text } from '@medusajs/ui'
import { useEffect, useState } from 'react'

type Status = 'loading' | 'idle' | 'saving' | 'saved' | 'error'

const OrderAlertsSettingsPage = () => {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    fetch('/admin/order-alert-emails', { credentials: 'include' })
      .then((res) => res.json())
      .then((data: { emails?: string[] }) => {
        setValue((data.emails || []).join(', '))
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [])

  const handleSave = async () => {
    setStatus('saving')
    const emails = value
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)

    try {
      const res = await fetch('/admin/order-alert-emails', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })
      if (!res.ok) throw new Error('Request failed')
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <Container className="p-6">
      <Heading level="h1">New Order Alerts</Heading>
      <Text className="text-ui-fg-subtle mt-2">
        Whenever a new order is placed, an alert email is sent to every address listed here (in
        addition to the customer's own order confirmation). Separate multiple addresses with
        commas.
      </Text>
      <Input
        className="mt-4"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="you@naricitas.shop, partner@naricitas.shop"
        disabled={status === 'loading'}
      />
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave} isLoading={status === 'saving'} disabled={status === 'loading'}>
          Save
        </Button>
        {status === 'saved' ? <Text className="text-ui-fg-subtle">Saved.</Text> : null}
        {status === 'error' ? (
          <Text className="text-ui-fg-error">Something went wrong — try again.</Text>
        ) : null}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: 'Order Alerts',
})

export default OrderAlertsSettingsPage
