import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../modules/quickbooks/service"

export async function GET(req: any, res: any) {
  const { code, realmId, state, error } = req.query as Record<string, string>
  const adminUrl = process.env.MEDUSA_ADMIN_URL || process.env.MEDUSA_BACKEND_URL || ""
  const redirectPath = "/app/integrations/quickbooks"

  if (error) {
    return res.redirect(`${adminUrl}${redirectPath}?qb_error=${encodeURIComponent(error)}`)
  }
  if (!code || !realmId) {
    return res.redirect(`${adminUrl}${redirectPath}?qb_error=missing_params`)
  }

  const expectedState = process.env.QUICKBOOKS_OAUTH_STATE || "woodys-seahorse"
  if (state && state !== expectedState) {
    return res.redirect(`${adminUrl}${redirectPath}?qb_error=invalid_state`)
  }

  const service = req.scope.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  try {
    await service.exchangeAndStore({ code, realmId })
    return res.redirect(`${adminUrl}${redirectPath}?qb_connected=1`)
  } catch (err: any) {
    console.error("[quickbooks] oauth callback failed", err?.message)
    return res.redirect(
      `${adminUrl}${redirectPath}?qb_error=${encodeURIComponent(err?.message || "unknown")}`
    )
  }
}
