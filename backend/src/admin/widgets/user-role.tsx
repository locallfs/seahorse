import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminUser } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  Select,
  StatusBadge,
  Text,
  toast,
} from "@medusajs/ui"
import { useState } from "react"

declare const __BACKEND_URL__: string | undefined

type Role = "admin" | "employee"

const roleFromMetadata = (metadata: Record<string, unknown> | null | undefined): Role => {
  return metadata?.role === "admin" ? "admin" : "employee"
}

const UserRoleWidget = ({ data }: DetailWidgetProps<AdminUser>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const initialRole = roleFromMetadata(data.metadata as Record<string, unknown> | null | undefined)
  const [savedRole, setSavedRole] = useState<Role>(initialRole)
  const [pendingRole, setPendingRole] = useState<Role>(initialRole)
  const [saving, setSaving] = useState(false)

  const dirty = pendingRole !== savedRole

  const save = async () => {
    setSaving(true)
    try {
      const nextMetadata = {
        ...(data.metadata as Record<string, unknown> | null ?? {}),
        role: pendingRole,
      }
      const res = await fetch(`${backendUrl}/admin/users/${data.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: nextMetadata }),
      })
      if (!res.ok) throw new Error()
      setSavedRole(pendingRole)
      toast.success(`Role set to ${pendingRole === "admin" ? "Admin" : "Employee"}`)
    } catch {
      toast.error("Failed to update role")
      setPendingRole(savedRole)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">ReefNerds Role</Heading>
        <StatusBadge color={savedRole === "admin" ? "green" : "grey"}>
          {savedRole === "admin" ? "Admin" : "Employee"}
        </StatusBadge>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          Admins can invite and remove other users from the ReefNerds mobile app.
          Employees can manage products and inventory only.
        </Text>
        <div className="flex items-center gap-3">
          <Select
            value={pendingRole}
            onValueChange={(value) => setPendingRole(value as Role)}
            disabled={saving}
          >
            <Select.Trigger className="w-48">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="employee">Employee</Select.Item>
              <Select.Item value="admin">Admin</Select.Item>
            </Select.Content>
          </Select>
          <Button
            variant="primary"
            size="small"
            disabled={!dirty || saving}
            isLoading={saving}
            onClick={save}
          >
            Save
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "user.details.after",
})

export default UserRoleWidget
