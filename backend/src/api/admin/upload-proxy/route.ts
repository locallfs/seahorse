import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const storageZone = process.env.BUNNY_STORAGE_ZONE
  const storagePassword = process.env.BUNNY_STORAGE_PASSWORD
  const storageEndpoint = (process.env.BUNNY_STORAGE_ENDPOINT || "").replace(/\/$/, "")
  const cdnUrl = (process.env.BUNNY_CDN_URL || "").replace(/\/$/, "")

  const fileKey = req.query.key as string
  if (!fileKey || !storagePassword) {
    res.status(400).json({ error: "Missing key or storage config" })
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req as any) {
    chunks.push(Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks)

  const bunnyUrl = `${storageEndpoint}/${storageZone}/${encodeURI(fileKey)}`
  const uploadRes = await fetch(bunnyUrl, {
    method: "PUT",
    headers: {
      AccessKey: storagePassword,
      "Content-Type": (req.headers["content-type"] as string) || "application/octet-stream",
    },
    body,
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "")
    res.status(uploadRes.status).json({ error: `Bunny upload failed: ${text}` })
    return
  }

  res.json({ url: `${cdnUrl}/${encodeURI(fileKey)}`, key: fileKey })
}
