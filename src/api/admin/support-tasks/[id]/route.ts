import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SUPPORT_TASKS_MODULE } from '../../../../modules/support-tasks'
import type SupportTasksModuleService from '../../../../modules/support-tasks/service'

// GET /admin/support-tasks/:id
// POST /admin/support-tasks/:id  (partial update)

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<SupportTasksModuleService>(SUPPORT_TASKS_MODULE)
  const task = await service.retrieveSupportTask(req.params.id).catch(() => null)
  if (!task) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ support_task: task })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<SupportTasksModuleService>(SUPPORT_TASKS_MODULE)
  const body = req.body as Record<string, unknown>

  const patch: Record<string, unknown> = {}
  const allowed = [
    'title', 'summary', 'status', 'priority', 'category', 'channel',
    'due_at', 'snoozed_until', 'resolved_at', 'resolution_note',
    'customer_id', 'customer_name', 'customer_email',
    'source_type', 'source_id', 'assignee_admin_user_id',
    'tags', 'metadata', 'updated_by_admin_id',
  ]
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  if (patch.status === 'resolved' && !patch.resolved_at) {
    patch.resolved_at = new Date().toISOString()
  }

  const task = await service.updateSupportTasks({ id: req.params.id, ...patch }).catch(() => null)
  if (!task) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ support_task: task })
}
