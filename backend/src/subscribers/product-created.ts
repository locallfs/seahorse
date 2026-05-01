import { ContainerRegistrationKeys, Modules } from "@medusajs/utils";

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
