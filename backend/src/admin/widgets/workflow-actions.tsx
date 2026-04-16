import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, StatusBadge, Text, toast } from "@medusajs/ui"
import { useState, useEffect, useCallback } from "react"

declare const __BACKEND_URL__: string | undefined

type WorkflowExecution = {
  id: string
  workflow_id: string
  transaction_id: string
  state: string
  created_at: string
}

const WorkflowActionsWidget = () => {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const backendUrl = __BACKEND_URL__ ?? ""

  const fetchExecutions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/admin/clear-workflows?filter=failed`, {
        credentials: "include",
      })
      const data = await res.json() as { executions?: WorkflowExecution[] }
      setExecutions(data.executions || [])
    } catch {
      toast.error("Failed to load workflow executions")
    } finally {
      setLoading(false)
    }
  }, [backendUrl])

  useEffect(() => {
    fetchExecutions()
  }, [fetchExecutions])

  const deleteOne = async (id: string) => {
    setDeleting((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`${backendUrl}/admin/clear-workflows`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })
      if (!res.ok) throw new Error()
      toast.success("Deleted workflow execution")
      setExecutions((prev) => prev.filter((e) => e.id !== id))
    } catch {
      toast.error("Failed to delete")
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const deleteAll = async () => {
    if (executions.length === 0) return
    const allIds = executions.map((e) => e.id)
    setDeleting(new Set(allIds))
    try {
      const res = await fetch(`${backendUrl}/admin/clear-workflows`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: allIds }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Deleted ${allIds.length} workflow executions`)
      setExecutions([])
    } catch {
      toast.error("Failed to delete workflows")
    } finally {
      setDeleting(new Set())
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Text size="small" className="text-ui-fg-muted">Loading failed workflows...</Text>
      </Container>
    )
  }

  if (executions.length === 0) {
    return null
  }

  return (
    <Container className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Heading level="h2">
          Failed Workflows ({executions.length})
        </Heading>
        <Button
          variant="danger"
          size="small"
          onClick={deleteAll}
          disabled={deleting.size > 0}
        >
          Delete All Failed
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {executions.map((exec) => (
          <div
            key={exec.id}
            className="flex items-center justify-between rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3"
          >
            <div className="flex flex-col gap-1">
              <Text size="small" weight="plus">
                {exec.workflow_id}
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                {exec.transaction_id}
              </Text>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge color={exec.state === "failed" ? "red" : "orange"}>
                {exec.state}
              </StatusBadge>
              <Button
                variant="danger"
                size="small"
                onClick={() => deleteOne(exec.id)}
                disabled={deleting.has(exec.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "workflow.list.before",
})

export default WorkflowActionsWidget
