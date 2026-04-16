import { defineMiddlewares } from "@medusajs/medusa"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/smart-import",
      method: "POST",
      middlewares: [upload.single("file")],
    },
  ],
})
