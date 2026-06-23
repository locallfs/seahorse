import { getStoreInfo, STORE_EMAIL, type StoreInfoTopic } from "./store-info";
import {
  searchProducts,
  listCustomerOrders,
  retrieveOrder,
  type OrderSummary,
} from "./medusa-server";

export type ToolContext = { customerToken?: string | null };

// Tool definitions handed to the AI model (OpenAI-compatible function schema).
export const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "check_stock",
      description:
        "Check live availability and price of products by name or keywords (e.g. 'black snowflake clownfish', 'red sea salt'). Use whenever a customer asks if something is in stock or what it costs.",
      parameters: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "Product name or keywords to search for.",
          },
        },
        required: ["product"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_orders",
      description:
        "Get the orders belonging to the currently signed-in customer. Use when a signed-in customer asks about their order or order status. Takes no arguments.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_guest_order",
      description:
        "Look up a single order for a guest who is not signed in. Requires BOTH the order ID and the email used on the order; only returns details if they match. Ask the customer for both before calling.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description:
              "The order ID from the confirmation email or order page.",
          },
          email: {
            type: "string",
            description: "The email address used to place the order.",
          },
        },
        required: ["order_id", "email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_store_info",
      description:
        "Get store policy/info text: shipping, returns, the live arrival guarantee (DOA process), hours, location, care, or general. Use for store-basics questions. Use 'guarantee' for live-arrival/DOA/dead-on-arrival questions and 'returns' for refunds and dry-goods returns.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: [
              "shipping",
              "returns",
              "guarantee",
              "hours",
              "location",
              "care",
              "general",
            ],
          },
        },
        required: ["topic"],
      },
    },
  },
] as const;

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount == null) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

function describeOrder(o: OrderSummary): string {
  const items = o.items.map((i) => `${i.quantity}x ${i.title}`).join(", ");
  const placed = new Date(o.created_at).toLocaleDateString("en-US");
  return `Order #${o.display_id} — status: ${o.status}; total: ${formatMoney(
    o.total,
    o.currency
  )}; placed: ${placed}; items: ${items || "n/a"}.`;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  try {
    if (name === "get_store_info") {
      const topic = (args.topic as StoreInfoTopic) || "general";
      return getStoreInfo(topic);
    }

    if (name === "check_stock") {
      const product = String(args.product || "").trim();
      if (!product) return "No product name was provided.";
      const results = await searchProducts(product);
      if (results.length === 0) {
        return `No products matched "${product}". It may be sold out or not carried. Suggest emailing ${STORE_EMAIL}.`;
      }
      return results
        .map((r) => {
          const price = formatMoney(r.price, r.currency);
          const stock = r.inStock ? "in stock" : "out of stock";
          return `${r.title}: ${stock}${price ? `, ${price}` : ""}.`;
        })
        .join("\n");
    }

    if (name === "get_my_orders") {
      const token = ctx.customerToken;
      if (!token) {
        return "The customer is NOT signed in. Ask them to sign in to see their orders, or offer the guest lookup (order ID + the email used on the order).";
      }
      const orders = await listCustomerOrders(token);
      if (orders.length === 0) return "This signed-in customer has no orders yet.";
      return orders.map(describeOrder).join("\n");
    }

    if (name === "lookup_guest_order") {
      const orderId = String(args.order_id || "").trim();
      const email = String(args.email || "").trim().toLowerCase();
      if (!orderId || !email) {
        return "Need both the order ID and the email used on the order.";
      }
      const order = await retrieveOrder(orderId);
      if (!order) {
        return `No order found with ID "${orderId}". Ask the customer to re-check the order ID from their confirmation email.`;
      }
      if (!order.email || order.email.toLowerCase() !== email) {
        return `The email provided does not match this order. Do NOT reveal any order details. Ask them to re-check the order ID and email, or email ${STORE_EMAIL}.`;
      }
      return describeOrder(order);
    }

    return `Unknown tool: ${name}`;
  } catch (err) {
    console.error("[api/chat] tool error", name, err);
    return `That lookup failed just now. Suggest trying again shortly or emailing ${STORE_EMAIL}.`;
  }
}
