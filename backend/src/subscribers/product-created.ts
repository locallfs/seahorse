import { ContainerRegistrationKeys, Modules } from "@medusajs/utils";
import { buildVariantSku } from "../lib/sku";

type EventData = { id: string };
type SubscriberArgs = {
  event: { data: EventData | EventData[] };
  container: { resolve: (key: string) => any };
};

export default async function productCreatedHandler({
  event,
  container,
}: SubscriberArgs) {
  try {
    const raw = event?.data;
    const ids: string[] = Array.isArray(raw)
      ? raw.map((d) => d.id).filter(Boolean)
      : raw?.id
        ? [raw.id]
        : [];
    if (ids.length === 0) return;
    console.log(`[product-created] fired for ${ids.length} product(s): ${ids.join(",")}`);

    const remoteLink: any = container.resolve(ContainerRegistrationKeys.LINK);
    const salesChannelModule: any = container.resolve(Modules.SALES_CHANNEL);
    const productModule: any = container.resolve(Modules.PRODUCT);

    // Auto-generate SKUs for any variant that doesn't have one yet.
    try {
      const allProducts = await productModule.listProducts(
        {},
        { relations: ["variants"], take: null },
      );
      const taken = new Set<string>();
      for (const p of allProducts) {
        for (const v of p.variants ?? []) {
          if (v.sku && v.sku.trim().length > 0) taken.add(v.sku.trim());
        }
      }

      for (const productId of ids) {
        const product = allProducts.find((p: any) => p.id === productId);
        if (!product) continue;
        const variants = product.variants ?? [];
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          if (variant.sku && variant.sku.trim().length > 0) continue;
          const sku = buildVariantSku(
            product.title,
            product.handle ?? null,
            i,
            variants.length,
            taken,
          );
          await productModule.updateProductVariants(variant.id, { sku });
          console.log(
            `[product-created] assigned SKU ${sku} to variant ${variant.id}`,
          );
        }
      }
    } catch (err: any) {
      console.error(
        `[product-created] sku auto-assign failed: ${err?.message || err}`,
      );
    }

    const channels = await salesChannelModule.listSalesChannels(
      {},
      { take: 100, select: ["id", "name"] },
    );
    if (!channels?.length) {
      console.warn("[product-created] no sales channels available, skipping");
      return;
    }
    console.log(
      `[product-created] linking to ${channels.length} sales channel(s): ${channels
        .map((c: any) => c.name)
        .join(", ")}`,
    );

    const links: any[] = [];
    for (const productId of ids) {
      for (const channel of channels) {
        links.push({
          [Modules.PRODUCT]: { product_id: productId },
          [Modules.SALES_CHANNEL]: { sales_channel_id: channel.id },
        });
      }
    }

    if (links.length === 0) return;

    await remoteLink.create(links).catch((err: any) => {
      // Most likely cause: link already exists. Safe to ignore.
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes("duplicate") || msg.includes("already")) {
        console.log("[product-created] link(s) already existed, skipped");
        return;
      }
      console.error(`[product-created] link.create failed: ${msg}`);
    });
  } catch (err: any) {
    console.error(`[product-created] subscriber crashed: ${err?.message || err}`);
  }
}

export const config = {
  event: "product.created",
};
