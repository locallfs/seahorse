import { model } from "@medusajs/utils"
import { Auction } from "./auction"

export const Bid = model.define("auction_bid", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  amount: model.number(),
  status: model
    .enum(["active", "outbid", "winning", "forfeited"])
    .default("active"),
  auction: model.belongsTo(() => Auction, { mappedBy: "bids" }),
})
