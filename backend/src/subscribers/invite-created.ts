import { Modules } from "@medusajs/utils";

type EventData = { id: string };
type SubscriberArgs = {
  event: { data: EventData };
  container: { resolve: (key: string) => any };
};

export default async function inviteCreatedHandler({
  event,
  container,
}: SubscriberArgs) {
  try {
    const inviteId = event?.data?.id;
    console.log(`[invite-created] fired for invite ${inviteId}`);
    if (!inviteId) return;

    const userModule: any = container.resolve(Modules.USER);
    const notificationModule: any = container.resolve(Modules.NOTIFICATION);

    const invite = await userModule.retrieveInvite(inviteId).catch((e: any) => {
      console.error(
        `[invite-created] retrieveInvite failed: ${e?.message || e}`,
      );
      return null;
    });
    if (!invite) return;

    const backendUrl =
      process.env.MEDUSA_BACKEND_URL ||
      "https://seahorse-production.up.railway.app";
    const acceptUrl = `${backendUrl}/app/invite?token=${invite.token}`;

    await notificationModule
      .createNotifications({
        to: invite.email,
        channel: "email",
        template: "staff-invite-created",
        data: {
          accept_url: acceptUrl,
          email: invite.email,
          expires_at: invite.expires_at,
          company_name: "Woody's Seahorse Aquarium & Supply",
        },
      })
      .then(() =>
        console.log(`[invite-created] event fired for ${invite.email}`),
      )
      .catch((err: any) =>
        console.error(
          `[invite-created] failed to fire event: ${err?.message || err}`,
        ),
      );
  } catch (err: any) {
    console.error(
      `[invite-created] subscriber crashed: ${err?.message || err}`,
    );
  }
}

export const config = {
  event: "invite.created",
};
