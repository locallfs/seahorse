import { defineMiddlewares, authenticate } from "@medusajs/medusa"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

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
