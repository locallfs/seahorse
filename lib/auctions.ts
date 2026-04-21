import { storeFetch } from "./storeFetch";

export type AuctionProduct = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  thumbnail: string | null;
  images: Array<{ url: string }>;
};

export type AuctionListItem = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  starting_bid: number;
  bid_increment: number;
  current_high_bid_amount: number | null;
  product: AuctionProduct | null;
};

export type AuctionBid = {
  id: string;
  amount: number;
  status: "active" | "outbid" | "winning" | "forfeited";
  created_at: string;
  bidder: string;
};

export type AuctionDetail = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  original_ends_at: string;
  starting_bid: number;
  bid_increment: number;
  current_high_bid: AuctionBid | null;
  min_next_bid: number;
  viewer_bid: { amount: number; status: AuctionBid["status"] } | null;
  bids: AuctionBid[];
  product: AuctionProduct | null;
};

export async function listAuctions() {
  return storeFetch<{ auctions: AuctionListItem[] }>("/store/auctions");
}

export async function getAuction(id: string) {
  return storeFetch<{ auction: AuctionDetail }>(`/store/auctions/${id}`);
}

export type AuctionInvoice = {
  auction: {
    id: string;
    status: string;
    winner_offer_status: "pending_payment" | "paid" | "forfeited" | "cascaded" | null;
    winner_offer_expires_at: string | null;
    amount: number;
    product: { id: string; title: string; thumbnail: string | null } | null;
  };
  card: { brand?: string; last4?: string } | null;
};

export async function getAuctionInvoice(id: string) {
  return storeFetch<AuctionInvoice>(`/store/auctions/${id}/pay`);
}

export async function payAuction(id: string) {
  return storeFetch<{ ok: true; payment_intent_id: string; amount: number }>(
    `/store/auctions/${id}/pay`,
    { method: "POST" }
  );
}

export async function placeBid(id: string, amountCents: number) {
  return storeFetch<{
    bid: { id: string; amount: number; status: string };
    auction: {
      id: string;
      ends_at: string;
      current_high_bid_amount: number;
      min_next_bid: number;
    };
  }>(`/store/auctions/${id}/bids`, {
    method: "POST",
    body: { amount: amountCents },
  });
}

export function formatCents(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
