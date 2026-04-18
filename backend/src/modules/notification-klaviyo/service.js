"use strict";
const { AbstractNotificationProviderService, MedusaError } = require("@medusajs/framework/utils");

const KLAVIYO_API_REVISION = "2024-10-15";
const KLAVIYO_EVENTS_URL = "https://a.klaviyo.com/api/events/";

class KlaviyoNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-klaviyo";

  constructor({ logger }, options) {
    super();
    if (!options?.private_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Klaviyo notification provider requires a private_key option"
      );
    }
    this.privateKey = options.private_key;
    this.publicKey = options.public_key || "";
    this.from = options.from || "Terry@seahorse-nw.com";
    this.companyName = options.company_name || "Woody's Seahorse Aquarium & Supply";
    this.logger = logger;
  }

  async send(notification) {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided"
      );
    }

    if (notification.channel === "feed") return {};

    const email = notification.to;
    if (!email) {
      this.logger?.warn(
        `[klaviyo] skipped notification — no recipient (template: ${notification.template || "n/a"})`
      );
      return {};
    }

    const metricName =
      notification.template || notification.channel || "medusa-notification";

    const properties = { ...(notification.data || {}) };
    if (notification.content?.subject) properties.subject = notification.content.subject;
    if (notification.content?.html) properties.html_body = notification.content.html;
    if (notification.content?.text) properties.text_body = notification.content.text;
    if (notification.from) properties.from = notification.from;
    properties.to = email;

    return this.trackEvent({ email, eventName: metricName, data: properties });
  }

  async trackEvent({ email, eventName, data }) {
    const payload = {
      data: {
        type: "event",
        attributes: {
          metric: {
            data: { type: "metric", attributes: { name: eventName } },
          },
          profile: {
            data: { type: "profile", attributes: { email } },
          },
          properties: data || {},
          unique_id: `${eventName}:${email}:${Date.now()}`,
        },
      },
    };

    try {
      const res = await fetch(KLAVIYO_EVENTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Klaviyo-API-Key ${this.privateKey}`,
          revision: KLAVIYO_API_REVISION,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        this.logger?.error(
          `[klaviyo] event "${eventName}" failed for ${email} (${res.status}): ${text}`
        );
      } else {
        this.logger?.info(
          `[klaviyo] event "${eventName}" fired for ${email}`
        );
      }
      return {};
    } catch (error) {
      this.logger?.error(
        `[klaviyo] event "${eventName}" network error for ${email}: ${error.message}`
      );
      return {};
    }
  }
}

module.exports = KlaviyoNotificationService;
module.exports.KlaviyoNotificationService = KlaviyoNotificationService;
