import { MedusaService } from '@medusajs/framework/utils'
import { SupportTask } from './models/support-task'

class SupportTasksModuleService extends MedusaService({
  SupportTask,
}) {}

export default SupportTasksModuleService
