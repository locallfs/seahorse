import { getApiBase } from "./client"
import type QuickbooksModuleService from "./service"

interface QboRequestOpts {
  method?: "GET" | "POST"
  path: string
  body?: unknown
}

export async function qboRequest<T = any>(
  service: QuickbooksModuleService,
  opts: QboRequestOpts
): Promise<T> {
  const creds = await service.getValidAccessToken()
  if (!creds) throw new Error("QuickBooks not connected")
  const { accessToken, realmId } = creds
  const url = `${getApiBase()}/v3/company/${realmId}${opts.path}`
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    const snippet = text.slice(0, 500)
    throw new Error(`QBO ${opts.method || "GET"} ${opts.path} → ${res.status}: ${snippet}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

export async function qboQuery<T = any>(
  service: QuickbooksModuleService,
  sql: string
): Promise<T> {
  const encoded = encodeURIComponent(sql)
  return qboRequest<T>(service, {
    method: "GET",
    path: `/query?query=${encoded}&minorversion=75`,
  })
}
