"use strict";
const { ModuleProvider, Modules } = require("@medusajs/framework/utils");
const BunnyFileService = require("./service");

module.exports = ModuleProvider(Modules.FILE, {
  services: [BunnyFileService],
});
