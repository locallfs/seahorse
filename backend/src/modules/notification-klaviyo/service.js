"use strict";
const { AbstractNotificationProviderService, MedusaError } = require("@medusajs/framework/utils");

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

    if (notification.channel === "feed") {
      return {};
    }

    const from = notification.from?.trim() || this.from;

    if (notification.content?.subject && notification.content?.html) {
      return this.sendTransactionalEmail({
        to: notification.to,
        from,
        subject: notification.content.subject,
        html: notification.content.html,
        data: notification.data,
      });
    }

    if (notification.template) {
      return this.sendTemplateEmail({
        to: notification.to,
        from,
        templateId: notification.template,
        data: notification.data,
      });
    }

    if (notification.data) {
      return this.trackEvent({
        email: notification.to,
        eventName: notification.template || "medusa-notification",
        data: notification.data,
      });
    }

    return {};
  }

  async sendTransactionalEmail({ to, from, subject, html }) {
    try {
      const res = await fetch("https://a.klaviyo.com/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Klaviyo-API-Key ${this.privateKey}`,
          revision: "2024-10-15",
        },
        body: JSON.stringify({
          data: {
            type: "email-send",
            attributes: {
              recipients: {
                to: [{ email: to }],
              },
              from: {
                email: from,
                name: this.companyName,
              },
              subject,
              body: { html },
            },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        this.logger.error(`Klaviyo email send failed (${res.status}): ${text}`);
      }

      return {};
    } catch (error) {
      this.logger.error(`Klaviyo email error: ${error.message}`);
      return {};
    }
  }

  async sendTemplateEmail({ to, from, templateId, data }) {
    try {
      const res = await fetch("https://a.klaviyo.com/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Klaviyo-API-Key ${this.privateKey}`,
          revision: "2024-10-15",
        },
        body: JSON.stringify({
          data: {
            type: "email-send",
            attributes: {
              recipients: {
                to: [{ email: to }],
              },
              from: {
                email: from,
                name: this.companyName,
              },
              template: { id: templateId },
              custom_variables: data || {},
            },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        this.logger.error(`Klaviyo template send failed (${res.status}): ${text}`);
      }

      return {};
    } catch (error) {
      this.logger.error(`Klaviyo template error: ${error.message}`);
      return {};
    }
  }

  async trackEvent({ email, eventName, data }) {
    try {
      const res = await fetch("https://a.klaviyo.com/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Klaviyo-API-Key ${this.privateKey}`,
          revision: "2024-10-15",
        },
        body: JSON.stringify({
          data: {
            type: "event",
            attributes: {
              metric: { data: { type: "metric", attributes: { name: eventName } } },
              profile: { data: { type: "profile", attributes: { email } } },
              properties: data || {},
            },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        this.logger.error(`Klaviyo event track failed (${res.status}): ${text}`);
      }

      return {};
    } catch (error) {
      this.logger.error(`Klaviyo event error: ${error.message}`);
      return {};
    }
  }
}

module.exports = KlaviyoNotificationService;
module.exports.KlaviyoNotificationService = KlaviyoNotificationService;
