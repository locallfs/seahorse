import { defineMiddlewares, authenticate } from "@medusajs/medusa"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
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
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/auctions*",
      method: "GET",
      middlewares: [
        authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
      ],
    },
  ],
})
