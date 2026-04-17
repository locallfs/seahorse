import { ExecArgs } from "@medusajs/types"
import { Modules } from "@medusajs/utils"

export default async function seedAdminRole({ container, args }: ExecArgs) {
  const email = args[0] ?? process.env.OWNER_EMAIL

  if (!email) {
    console.error(
      "Usage: medusa exec ./src/scripts/seed-admin-role.ts <email>\n" +
        "Or set OWNER_EMAIL in the environment."
    )
    process.exit(1)
  }

  const userModule = container.resolve(Modules.USER)
  const [users] = await userModule.listAndCountUsers({ email })

  if (users.length === 0) {
    console.error(`No user found with email ${email}`)
    process.exit(1)
  }

  const user = users[0]
  const nextMetadata = {
    ...(user.metadata ?? {}),
    role: "admin",
  }

  await userModule.updateUsers([{ id: user.id, metadata: nextMetadata }])

  console.log(`Marked ${user.email} (${user.id}) as admin`)
}
