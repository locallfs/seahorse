"use strict";
const { ModuleProvider, Modules } = require("@medusajs/framework/utils");
const StripeTaxProvider = require("./service");

module.exports = ModuleProvider(Modules.TAX, {
  services: [StripeTaxProvider],
});
