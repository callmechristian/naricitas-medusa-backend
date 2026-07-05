import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SUPPORT_TASKS_MODULE } from '../../../modules/support-tasks'
import type SupportTasksModuleService from '../../../modules/support-tasks/service'

// GET /admin/support-tasks?status=open&priority=urgent&limit=100&offset=0
// POST /admin/support-tasks

const STATUSES = new Set(['open', 'in_progress', 'waiting_customer', 'resolved'])
const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent'])
const CATEGORIES = new Set(['refund', 'exchange', 'delivery', 'subscription', 'vip_followup'])

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<SupportTasksModuleService>(SUPPORT_TASKS_MODULE)
  const sp = req.query as Record<string, string | undefined>

  const filters: Record<string, unknown> = {}
  if (sp.status && sp.status !== 'any') {
    if (sp.status === 'open') filters.status = { $ne: 'resolved' }
    else if (STATUSES.has(sp.status)) filters.status = sp.status
  }
  if (sp.priority && sp.priority !== 'any' && PRIORITIES.has(sp.priority)) filters.priority = sp.priority
  if (sp.category && sp.category !== 'any' && CATEGORIES.has(sp.category)) filters.category = sp.category
  if (sp.assignee_admin_user_id) filters.assignee_admin_user_id = sp.assignee_admin_user_id

  const limit = Math.min(500, Math.max(1, parseInt(sp.limit || '100', 10) || 100))
  const offset = Math.max(0, parseInt(sp.offset || '0', 10) || 0)

  const [tasks, count] = await service.listAndCountSupportTasks(filters, {
    take: limit,
    skip: offset,
    order: { updated_at: 'DESC' },
  })

  res.json({ support_tasks: tasks, count, limit, offset })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<SupportTasksModuleService>(SUPPORT_TASKS_MODULE)
  const body = req.body as Record<string, unknown>

  if (!body?.title || typeof body.title !== 'string') {
    res.status(400).json({ error: 'title is required' })
    return
  }
  if (!body?.category || !CATEGORIES.has(String(body.category))) {
    res.status(400).json({ error: 'valid category is required' })
    return
  }

  const task = await service.createSupportTasks({
    title: body.title,
    summary: (body.summary as string) || null,
    status: STATUSES.has(String(body.status)) ? (body.status as string) : 'open',
    priority: PRIORITIES.has(String(body.priority)) ? (body.priority as string) : 'normal',
    category: body.category as string,
    channel: (body.channel as string) || null,
    due_at: (body.due_at as string) || null,
    customer_id: (body.customer_id as string) || null,
    customer_name: (body.customer_name as string) || null,
    customer_email: (body.customer_email as string) || null,
    source_type: (body.source_type as string) || null,
    source_id: (body.source_id as string) || null,
    assignee_admin_user_id: (body.assignee_admin_user_id as string) || null,
    tags: (body.tags as unknown) || null,
    metadata: (body.metadata as unknown) || null,
  })

  res.status(201).json({ support_task: task })
}
