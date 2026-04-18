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
  const inviteId = event?.data?.id;
  console.log(`[invite-created] fired for invite ${inviteId}`);
  if (!inviteId) return;

  const userModule: any = container.resolve(Modules.USER);
  const notificationModule: any = container.resolve(Modules.NOTIFICATION);

  const invite = await userModule.retrieveInvite(inviteId);
  if (!invite) {
    console.log(`[invite-created] invite ${inviteId} not found`);
    return;
  }

  const backendUrl =
    process.env.MEDUSA_BACKEND_URL ||
    "https://seahorse-production.up.railway.app";
  const acceptUrl = `${backendUrl}/app/invite?token=${invite.token}`;

  const subject =
    "You've been invited to join Woody's Seahorse Aquarium & Supply";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="color:#d4af37;margin:0 0 16px;">Welcome to the team</h2>
      <p>You've been invited to join the Woody's Seahorse Aquarium &amp; Supply staff dashboard.</p>
      <p>Click the button below to create your password and finish setting up your account. This link expires in 7 days.</p>
      <p style="margin:32px 0;">
        <a href="${acceptUrl}" style="background:#0f172a;color:#d4af37;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Accept Your Invite</a>
      </p>
      <p style="font-size:12px;color:#64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size:12px;color:#64748b;word-break:break-all;">${acceptUrl}</p>
    </div>
  `;

  try {
    await notificationModule.createNotifications({
      to: invite.email,
      channel: "email",
      template: "invite-created",
      content: { subject, html },
      data: { accept_url: acceptUrl, email: invite.email },
    });
    console.log(`[invite-created] email sent to ${invite.email}`);
  } catch (err: any) {
    console.error(
      `[invite-created] failed to send email: ${err?.message || err}`,
    );
  }
}

export const config = {
  event: "invite.created",
};
