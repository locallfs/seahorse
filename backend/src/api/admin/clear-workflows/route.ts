export async function GET(req: any, res: any) {
  const workflowEngine = req.scope.resolve("workflows")

  try {
    const { filter } = req.query
    const stateFilter = filter === "failed"
      ? { state: { $in: ["failed", "reverted"] } }
      : filter === "waiting"
        ? { state: { $in: ["waiting_to_compensate"] } }
        : {}

    const [executions, count] = await workflowEngine.listAndCountWorkflowExecutions(
      stateFilter,
      { skip: 0, take: 200 }
    )

    res.json({ executions: executions || [], count })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function DELETE(req: any, res: any) {
  const workflowEngine = req.scope.resolve("workflows")

  try {
    const { ids } = req.body || {}

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.json({ deleted: 0, message: "No IDs provided" })
      return
    }

    await workflowEngine.deleteWorkflowExecutions(ids)
    res.json({ deleted: ids.length })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
