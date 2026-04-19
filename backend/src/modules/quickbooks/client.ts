const INTUIT_AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2"
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
const INTUIT_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke"

const SANDBOX_API = "https://sandbox-quickbooks.api.intuit.com"
const PRODUCTION_API = "https://quickbooks.api.intuit.com"

export function getApiBase(): string {
  return process.env.QUICKBOOKS_ENVIRONMENT === "production"
    ? PRODUCTION_API
    : SANDBOX_API
}

export function buildAuthUrl(state: string): string {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI
  if (!clientId || !redirectUri) {
    throw new Error("QUICKBOOKS_CLIENT_ID and QUICKBOOKS_REDIRECT_URI must be set")
  }
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirectUri,
    state,
  })
  return `${INTUIT_AUTH_BASE}?${params.toString()}`
}

function basicAuthHeader(): string {
  const id = process.env.QUICKBOOKS_CLIENT_ID || ""
  const secret = process.env.QUICKBOOKS_CLIENT_SECRET || ""
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64")
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  x_refresh_token_expires_in: number
  token_type: string
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || ""
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error(`Intuit token exchange failed: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as TokenResponse
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error(`Intuit token refresh failed: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as TokenResponse
}

export async function revokeToken(refreshToken: string): Promise<void> {
  await fetch(INTUIT_REVOKE_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: refreshToken }),
  })
}
