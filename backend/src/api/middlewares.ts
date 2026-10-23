import { defineMiddlewares, authenticate } from "@medusajs/medusa"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

/**
 * Medusa stores product height/width/length/weight as TEXT, so reading a
 * product back gives strings — but the write validator demands numbers. Any
 * client that round-trips those fields unedited is rejected with:
 *   Expected type: 'number' for field 'weight', got: 'string'
 *
 * That broke every product edit from the ReefNerds app the moment the dry-goods
 * weights were populated (before that the fields were null and never sent).
 * The app now coerces too, but this keeps already-installed builds working and
 * is the right thing regardless: accept what we ourselves hand out.
 *
 * Only these four numeric fields are touched, only when the value is a string
 * that parses cleanly. Anything else is passed through untouched so genuinely
 * invalid input still fails validation.
 */
const NUMERIC_PRODUCT_FIELDS = ["weight", "length", "height", "width"] as const

const coerceProductDimensions = (req: any, _res: any, next: any) => {
  const body = req?.body
  if (body && typeof body === "object") {
    for (const field of NUMERIC_PRODUCT_FIELDS) {
      const value = body[field]
      if (typeof value !== "string") continue
      const trimmed = value.trim()
      if (trimmed === "") {
        body[field] = null
        continue
      }
      const n = Number(trimmed)
      if (Number.isFinite(n)) body[field] = n
    }
  }
  return next()
}

// Auctions are retired for now. These routes return 410 Gone unless
// AUCTIONS_ENABLED=true, so no bids can be placed and no saved card can be
// charged while the feature is off.
const requireAuctionsEnabled = (req: any, res: any, next: any) => {
  if (process.env.AUCTIONS_ENABLED !== "true") {
    return res
      .status(410)
      .json({ message: "Auctions are not currently available." })
  }
  return next()
}

export default defineMiddlewares({
  routes: [
    {
      // Accept the string dimensions our own API returns. See
      // coerceProductDimensions above.
      matcher: "/admin/products*",
      method: ["POST"],
      middlewares: [coerceProductDimensions],
    },
    {
      // Intuit signs the raw request bytes; webhook signature verification
      // needs the original body, not a re-serialization of the parsed JSON.
      matcher: "/webhooks/quickbooks",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
    {
      matcher: "/admin/smart-import",
      method: "POST",
      middlewares: [upload.single("file")],
    },
    {
      matcher: "/store/payment-methods*",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/auctions/*/bids",
      method: "POST",
      middlewares: [
        requireAuctionsEnabled,
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/auctions/*/pay",
      middlewares: [
        requireAuctionsEnabled,
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/auctions/my-bids",
      method: "GET",
      middlewares: [
        requireAuctionsEnabled,
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/auctions*",
      method: "GET",
      middlewares: [
        requireAuctionsEnabled,
        authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
      ],
    },
  ],
})
