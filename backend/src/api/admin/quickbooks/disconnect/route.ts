import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../modules/quickbooks/service"

export async function POST(req: any, res: any) {
  const service = req.scope.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  try {
    await service.disconnect()
    res.json({ disconnected: true })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to disconnect" })
  }
}
