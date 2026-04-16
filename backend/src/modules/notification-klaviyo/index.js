"use strict";
const { ModuleProvider, Modules } = require("@medusajs/framework/utils");
const KlaviyoNotificationService = require("./service");

module.exports = ModuleProvider(Modules.NOTIFICATION, {
  services: [KlaviyoNotificationService],
});
