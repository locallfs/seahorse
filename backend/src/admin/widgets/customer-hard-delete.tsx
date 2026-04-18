import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DetailWidgetProps, AdminCustomer } from "@medusajs/types";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui";
import { useState } from "react";

declare const __BACKEND_URL__: string | undefined;

const CustomerHardDeleteWidget = ({ data }: DetailWidgetProps<AdminCustomer>) => {
  const backendUrl = __BACKEND_URL__ ?? "";
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete =
    !!data.email &&
    confirmEmail.trim().toLowerCase() === data.email.toLowerCase() &&
    !deleting;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `${backendUrl}/admin/customers/${data.id}/hard-delete`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Delete failed");
      }
      toast.success(`Permanently removed ${data.email}`);
      window.location.href = "/app/customers";
    } catch (e: any) {
      toast.error(e?.message || "Could not hard-delete customer");
      setDeleting(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Danger Zone</Heading>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          Permanently removes this customer from the database, including
          addresses, group memberships, and their login account. This cannot
          be undone. Orders remain but will no longer link to a customer
          profile.
        </Text>
        <div className="flex flex-col gap-2">
          <Label size="xsmall" weight="plus">
            Type the customer&rsquo;s email to confirm
          </Label>
          <Input
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={data.email ?? ""}
            disabled={deleting}
          />
        </div>
        <div>
          <Button
            variant="danger"
            size="small"
            disabled={!canDelete}
            isLoading={deleting}
            onClick={handleDelete}
          >
            Delete Customer Permanently
          </Button>
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "customer.details.after",
});

export default CustomerHardDeleteWidget;
