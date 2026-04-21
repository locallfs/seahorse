import { Module } from "@medusajs/utils"
import AuctionsModuleService from "./service"

export const AUCTIONS_MODULE = "auctions"

export default Module(AUCTIONS_MODULE, {
  service: AuctionsModuleService,
})
