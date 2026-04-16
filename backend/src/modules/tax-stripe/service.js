"use strict";
const Stripe = require("stripe");
const { MedusaError } = require("@medusajs/framework/utils");

class StripeTaxProvider {
  static identifier = "stripe-tax";

  constructor(_, options) {
    if (!options?.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe Tax provider requires an api_key option"
      );
    }
    this.stripe = new Stripe(options.api_key);
  }

  getIdentifier() {
    return StripeTaxProvider.identifier;
  }

  async getTaxLines(itemLines, shippingLines, context) {
    const address = context.address;
    if (!address?.country_code) {
      return this.fallbackTaxLines(itemLines, shippingLines);
    }

    try {
      const lineItems = itemLines.map((item) => ({
        amount: Math.round(item.line_item.unit_price * item.line_item.quantity),
        reference: item.line_item.id,
        tax_behavior: "exclusive",
        tax_code: "txcd_99999999",
      }));

      shippingLines.forEach((shipping) => {
        lineItems.push({
          amount: Math.round(shipping.shipping_line.unit_price),
          reference: shipping.shipping_line.id,
          tax_behavior: "exclusive",
          tax_code: "txcd_92010001",
        });
      });

      if (lineItems.length === 0) {
        return [];
      }

      const stripeAddress = {
        country: address.country_code.toUpperCase(),
      };
      if (address.province_code) stripeAddress.state = address.province_code.toUpperCase();
      if (address.postal_code) stripeAddress.postal_code = address.postal_code;
      if (address.city) stripeAddress.city = address.city;
      if (address.address_1) stripeAddress.line1 = address.address_1;
      if (address.address_2) stripeAddress.line2 = address.address_2;

      const calculation = await this.stripe.tax.calculations.create({
        currency: "usd",
        line_items: lineItems,
        customer_details: {
          address: stripeAddress,
          address_source: "shipping",
        },
      });

      const taxLines = [];

      for (const calcLine of calculation.line_items.data) {
        const rate = calcLine.amount_tax > 0
          ? (calcLine.amount_tax / calcLine.amount) * 100
          : 0;

        const matchingItem = itemLines.find(
          (il) => il.line_item.id === calcLine.reference
        );
        if (matchingItem) {
          taxLines.push({
            rate,
            name: "Sales Tax",
            code: "sales-tax",
            line_item_id: matchingItem.line_item.id,
            provider_id: this.getIdentifier(),
          });
          continue;
        }

        const matchingShipping = shippingLines.find(
          (sl) => sl.shipping_line.id === calcLine.reference
        );
        if (matchingShipping) {
          taxLines.push({
            rate,
            name: "Shipping Tax",
            code: "shipping-tax",
            shipping_line_id: matchingShipping.shipping_line.id,
            provider_id: this.getIdentifier(),
          });
        }
      }

      return taxLines;
    } catch (error) {
      console.log("Stripe Tax calculation failed, using fallback:", error.message);
      return this.fallbackTaxLines(itemLines, shippingLines);
    }
  }

  fallbackTaxLines(itemLines, shippingLines) {
    const taxLines = itemLines.flatMap((l) =>
      l.rates.map((r) => ({
        rate_id: r.id,
        rate: r.rate || 0,
        name: r.name,
        code: r.code,
        line_item_id: l.line_item.id,
        provider_id: this.getIdentifier(),
      }))
    );

    shippingLines.forEach((l) => {
      l.rates.forEach((r) => {
        taxLines.push({
          rate_id: r.id,
          rate: r.rate || 0,
          name: r.name,
          code: r.code,
          shipping_line_id: l.shipping_line.id,
          provider_id: this.getIdentifier(),
        });
      });
    });

    return taxLines;
  }
}

module.exports = StripeTaxProvider;
module.exports.StripeTaxProvider = StripeTaxProvider;
