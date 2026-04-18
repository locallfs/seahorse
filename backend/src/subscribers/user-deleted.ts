import { Modules } from "@medusajs/utils";

type EventData = { id: string };
type SubscriberArgs = {
  event: { data: EventData };
  container: { resolve: (key: string) => any };
};

export default async function userDeletedHandler({
  event,
  container,
}: SubscriberArgs) {
  try {
    const userId = event?.data?.id;
    console.log(`[user-deleted] fired for user ${userId}`);
    if (!userId) return;

    const userModule: any = container.resolve(Modules.USER);
    const authModule: any = container.resolve(Modules.AUTH);

    const users = await userModule
      .listUsers({ id: [userId] }, { withDeleted: true })
      .catch((e: any) => {
        console.error(
          `[user-deleted] listUsers failed: ${e?.message || e}`,
        );
        return [];
      });
    const email = users?.[0]?.email;
    if (!email) {
      console.warn(
        `[user-deleted] no email found for user ${userId}, skipping auth cleanup`,
      );
      return;
    }

    const providerIdentities = await authModule
      .listProviderIdentities({ entity_id: email })
      .catch((e: any) => {
        console.error(
          `[user-deleted] listProviderIdentities failed: ${e?.message || e}`,
        );
        return [];
      });
    if (!providerIdentities?.length) {
      console.log(`[user-deleted] no auth rows for ${email}`);
      return;
    }

    const authIdentityIds = Array.from(
      new Set(
        providerIdentities
          .map((pi: any) => pi.auth_identity_id)
          .filter(Boolean),
      ),
    );
    if (!authIdentityIds.length) return;

    await authModule.deleteAuthIdentities(authIdentityIds);
    console.log(
      `[user-deleted] purged ${authIdentityIds.length} auth identity rows for ${email}`,
    );
  } catch (err: any) {
    console.error(
      `[user-deleted] subscriber crashed: ${err?.message || err}`,
    );
  }
}

export const config = {
  event: "user.user.deleted",
};
