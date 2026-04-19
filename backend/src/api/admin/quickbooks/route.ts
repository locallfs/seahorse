import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../modules/quickbooks/service"

export async function GET(req: any, res: any) {
  const service = req.scope.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  try {
    const connection = await service.getConnection()
    const configured = Boolean(
      process.env.QUICKBOOKS_CLIENT_ID &&
      process.env.QUICKBOOKS_CLIENT_SECRET &&
      process.env.QUICKBOOKS_REDIRECT_URI
    )
    res.json({
      configured,
      connected: !!connection,
      connection,
      environment: process.env.QUICKBOOKS_ENVIRONMENT || "sandbox",
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to load status" })
  }
}
