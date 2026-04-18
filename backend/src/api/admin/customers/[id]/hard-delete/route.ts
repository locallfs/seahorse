import { ContainerRegistrationKeys, Modules } from "@medusajs/utils";

export async function DELETE(req: any, res: any) {
  const customerId = req.params?.id;
  console.log(`[customer-hard-delete] requested for ${customerId}`);

  if (!customerId) {
    res.status(400).json({ error: "Missing customer id" });
    return;
  }

  try {
    const customerModule: any = req.scope.resolve(Modules.CUSTOMER);
    const authModule: any = req.scope.resolve(Modules.AUTH);
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);

    const customers = await customerModule
      .listCustomers({ id: [customerId] }, { withDeleted: true })
      .catch(() => []);
    const customer = customers?.[0];
    const email = customer?.email ?? null;
    const hasAccount = !!customer?.has_account;

    if (hasAccount && email) {
      const providerIdentities = await authModule
        .listProviderIdentities({ entity_id: email })
        .catch(() => []);
      const authIdentityIds = Array.from(
        new Set(
          (providerIdentities || [])
            .map((pi: any) => pi.auth_identity_id)
            .filter(Boolean),
        ),
      );
      if (authIdentityIds.length) {
        await authModule.deleteAuthIdentities(authIdentityIds).catch((e: any) => {
          console.error(
            `[customer-hard-delete] auth cleanup failed: ${e?.message || e}`,
          );
        });
      }
    }

    const deleted = await pg.raw(
      'DELETE FROM "customer" WHERE "id" = ? RETURNING "id"',
      [customerId],
    );
    const rowCount = Array.isArray(deleted)
      ? deleted[0]?.rowCount ?? deleted[0]?.length ?? 0
      : deleted?.rowCount ?? 0;

    console.log(
      `[customer-hard-delete] removed ${rowCount} row(s) for ${email ?? customerId}`,
    );

    res.json({ id: customerId, deleted: rowCount > 0, email });
  } catch (err: any) {
    console.error(
      `[customer-hard-delete] failed: ${err?.message || err}`,
    );
    res.status(500).json({ error: err?.message || "Hard delete failed" });
  }
}
