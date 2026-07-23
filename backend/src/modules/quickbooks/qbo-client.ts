import { getApiBase } from "./client"
import type QuickbooksModuleService from "./service"

interface QboRequestOpts {
  method?: "GET" | "POST"
  path: string
  body?: unknown
}

// QBO throttles at ~500 requests/min per company. Pace every call (~150ms
// apart ≈ 400/min ceiling) and retry once on 429 so bulk resyncs can't
// starve the live sync with rate-limit failures.
const MIN_CALL_GAP_MS = 150
let lastCallAt = 0
async function pace(): Promise<void> {
  const wait = lastCallAt + MIN_CALL_GAP_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCallAt = Date.now()
}

export async function qboRequest<T = any>(
  service: QuickbooksModuleService,
  opts: QboRequestOpts
): Promise<T> {
  const creds = await service.getValidAccessToken()
  if (!creds) throw new Error("QuickBooks not connected")
  const { accessToken, realmId } = creds
  const url = `${getApiBase()}/v3/company/${realmId}${opts.path}`
  const doFetch = async () => {
    await pace()
    return fetch(url, {
      method: opts.method || "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  }
  let res = await doFetch()
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000))
    res = await doFetch()
  }
  const text = await res.text()
  if (!res.ok) {
    const snippet = text.slice(0, 500)
    // intuit_tid is Intuit's per-request trace id; including it in the error
    // (and thus every sync log entry) lets Intuit support locate the request.
    const tid = res.headers.get("intuit_tid")
    throw new Error(
      `QBO ${opts.method || "GET"} ${opts.path} → ${res.status}${tid ? ` [intuit_tid ${tid}]` : ""}: ${snippet}`
    )
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
