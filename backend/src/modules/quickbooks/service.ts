import { MedusaService } from "@medusajs/utils"
import { QuickbooksConnection } from "./models/connection"
import { encrypt, decrypt } from "./crypto"
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  TokenResponse,
} from "./client"

class QuickbooksModuleService extends MedusaService({
  QuickbooksConnection,
}) {
  async saveTokens(params: {
    realmId: string
    tokens: TokenResponse
  }): Promise<void> {
    const now = Date.now()
    const accessExpiresAt = new Date(now + params.tokens.expires_in * 1000)
    const refreshExpiresAt = new Date(
      now + params.tokens.x_refresh_token_expires_in * 1000
    )
    const environment = process.env.QUICKBOOKS_ENVIRONMENT || "sandbox"

    const existing = await this.listQuickbooksConnections({})
    const payload = {
      realm_id: params.realmId,
      access_token_encrypted: encrypt(params.tokens.access_token),
      refresh_token_encrypted: encrypt(params.tokens.refresh_token),
      access_token_expires_at: accessExpiresAt,
      refresh_token_expires_at: refreshExpiresAt,
      environment,
      last_error: null,
    }

    if (existing.length > 0) {
      await this.updateQuickbooksConnections({
        id: existing[0].id,
        ...payload,
      })
    } else {
      await this.createQuickbooksConnections(payload)
    }
  }

  async getConnection(): Promise<null | {
    id: string
    realm_id: string
    environment: string
    access_token_expires_at: Date
    refresh_token_expires_at: Date | null
    last_error: string | null
  }> {
    const rows = await this.listQuickbooksConnections({})
    if (rows.length === 0) return null
    const c = rows[0]
    return {
      id: c.id,
      realm_id: c.realm_id,
      environment: c.environment,
      access_token_expires_at: c.access_token_expires_at,
      refresh_token_expires_at: c.refresh_token_expires_at,
      last_error: c.last_error,
    }
  }

  async getValidAccessToken(): Promise<{ accessToken: string; realmId: string } | null> {
    const rows = await this.listQuickbooksConnections({})
    if (rows.length === 0) return null
    const c = rows[0]
    const now = Date.now()
    const expires = new Date(c.access_token_expires_at).getTime()
    // Refresh if within 5 minutes of expiry.
    if (expires - now > 5 * 60 * 1000) {
      return {
        accessToken: decrypt(c.access_token_encrypted),
        realmId: c.realm_id,
      }
    }
    const refreshToken = decrypt(c.refresh_token_encrypted)
    const fresh = await refreshAccessToken(refreshToken)
    await this.saveTokens({ realmId: c.realm_id, tokens: fresh })
    return {
      accessToken: fresh.access_token,
      realmId: c.realm_id,
    }
  }

  async exchangeAndStore(params: {
    code: string
    realmId: string
  }): Promise<void> {
    const tokens = await exchangeCodeForTokens(params.code)
    await this.saveTokens({ realmId: params.realmId, tokens })
  }

  async disconnect(): Promise<void> {
    const rows = await this.listQuickbooksConnections({})
    if (rows.length === 0) return
    const c = rows[0]
    try {
      const refreshToken = decrypt(c.refresh_token_encrypted)
      await revokeToken(refreshToken)
    } catch {
      // Best effort — still delete the local record.
    }
    await this.deleteQuickbooksConnections(c.id)
  }

  async recordError(message: string): Promise<void> {
    const rows = await this.listQuickbooksConnections({})
    if (rows.length === 0) return
    await this.updateQuickbooksConnections({
      id: rows[0].id,
      last_error: message.slice(0, 2000),
    })
  }
}

export default QuickbooksModuleService
