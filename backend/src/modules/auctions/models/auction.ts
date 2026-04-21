import { model } from "@medusajs/utils"
import { Bid } from "./bid"

export const Auction = model.define("auction", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  status: model
    .enum(["scheduled", "live", "ended", "cancelled", "relisted"])
    .default("scheduled"),
  starts_at: model.dateTime(),
  ends_at: model.dateTime(),
  original_ends_at: model.dateTime(),
  starting_bid: model.number(),
  bid_increment: model.number().default(500),
  reserve_price: model.number().nullable(),
  reserve_met: model.boolean().default(false),
  current_high_bid_id: model.text().nullable(),
  winner_customer_id: model.text().nullable(),
  winner_offer_status: model
    .enum(["pending_payment", "paid", "forfeited", "cascaded"])
    .nullable(),
  winner_offer_expires_at: model.dateTime().nullable(),
  cascade_position: model.number().default(0),
  metadata: model.json().nullable(),
  bids: model.hasMany(() => Bid, { mappedBy: "auction" }),
})
