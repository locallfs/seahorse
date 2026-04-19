import { buildAuthUrl } from "../../../../modules/quickbooks/client"

export async function POST(req: any, res: any) {
  try {
    if (
      !process.env.QUICKBOOKS_CLIENT_ID ||
      !process.env.QUICKBOOKS_CLIENT_SECRET ||
      !process.env.QUICKBOOKS_REDIRECT_URI
    ) {
      return res.status(400).json({
        error: "QuickBooks env vars not configured on the backend",
      })
    }
    const state = process.env.QUICKBOOKS_OAUTH_STATE || "woodys-seahorse"
    const url = buildAuthUrl(state)
    res.json({ url })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to start OAuth" })
  }
}
