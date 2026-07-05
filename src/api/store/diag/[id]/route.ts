import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { completeCartWorkflow } from '@medusajs/medusa/core-flows'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)

  const { errors, result, transaction } = await workflowEngine.run(
    completeCartWorkflow,
    {
      input: {
        id: req.params.id,
      },
    }
  )

  res.json({
    result,
    errors: errors?.map((e: any) => ({
      step: e.step,
      message: e.error?.message || e.message,
      stack: e.error?.stack,
    })),
    transaction: transaction ? { transactionId: transaction.transactionId, state: transaction.state, flowState: transaction.flow?.state } : null,
  })
}
