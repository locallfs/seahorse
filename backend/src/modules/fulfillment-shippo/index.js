"use strict";
const { ModuleProvider, Modules } = require("@medusajs/framework/utils");
const ShippoFulfillmentService = require("./service");

module.exports = ModuleProvider(Modules.FULFILLMENT, {
  services: [ShippoFulfillmentService],
});
