import { defineRouteConfig } from '@medusajs/admin-sdk'
import { LifeBuoy } from '@medusajs/icons'
import { Badge, Container, Heading, Select, Text } from '@medusajs/ui'
import { useEffect, useState } from 'react'

type SupportTask = {
  id: string
  title: string
  summary?: string | null
  status: string
  priority: string
  category: string
  customer_name?: string | null
  customer_email?: string | null
  due_at?: string | null
  updated_at: string
}

const STATUSES = ['open', 'in_progress', 'waiting_customer', 'resolved']
const PRIORITY_COLOR: Record<string, 'red' | 'orange' | 'blue' | 'grey'> = {
  urgent: 'red',
  high: 'orange',
  normal: 'blue',
  low: 'grey',
}

const SupportTasksPage = () => {
  const [tasks, setTasks] = useState<SupportTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch('/admin/support-tasks?status=open&limit=200', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setTasks(data.support_tasks || []))
      .catch(() => setError('Failed to load support tasks.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    await fetch(`/admin/support-tasks/${id}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (status === 'resolved') load();
  }

  return (
    <Container className="p-6">
      <Heading level="h1">Support Tasks</Heading>
      <Text className="text-ui-fg-subtle mt-2">
        Open follow-ups: refunds, exchanges, delivery issues, VIP outreach.
      </Text>

      {error ? <Text className="text-ui-fg-error mt-4">{error}</Text> : null}
      {loading ? <Text className="text-ui-fg-subtle mt-4">Loading…</Text> : null}

      {!loading && !error ? (
        <div className="mt-4 flex flex-col gap-2">
          {tasks.length === 0 ? (
            <Text className="text-ui-fg-subtle">No open support tasks. 🎉</Text>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-4 rounded-lg border border-ui-border-base p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Text weight="plus">{task.title}</Text>
                    <Badge color={PRIORITY_COLOR[task.priority] || 'grey'}>{task.priority}</Badge>
                    <Badge color="grey">{task.category}</Badge>
                  </div>
                  {task.summary ? <Text size="small" className="text-ui-fg-subtle">{task.summary}</Text> : null}
                  {task.customer_name || task.customer_email ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      {task.customer_name || task.customer_email}
                    </Text>
                  ) : null}
                </div>
                <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v)}>
                  <Select.Trigger className="w-44">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {STATUSES.map((s) => (
                      <Select.Item key={s} value={s}>{s.replace('_', ' ')}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            ))
          )}
        </div>
      ) : null}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: 'Support Tasks',
  icon: LifeBuoy,
})

export default SupportTasksPage
