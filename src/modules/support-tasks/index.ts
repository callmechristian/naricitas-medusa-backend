import SupportTasksModuleService from './service'
import { Module } from '@medusajs/framework/utils'

export const SUPPORT_TASKS_MODULE = 'support_tasks'

export default Module(SUPPORT_TASKS_MODULE, {
  service: SupportTasksModuleService,
})
