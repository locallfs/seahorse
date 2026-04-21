import { Migration } from "@mikro-orm/migrations"

export class Migration20260420000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "auction" (
        "id" text not null,
        "product_id" text not null,
        "status" text not null default 'scheduled',
        "starts_at" timestamptz not null,
        "ends_at" timestamptz not null,
        "original_ends_at" timestamptz not null,
        "starting_bid" integer not null,
        "bid_increment" integer not null default 500,
        "reserve_price" integer null,
        "reserve_met" boolean not null default false,
        "current_high_bid_id" text null,
        "winner_customer_id" text null,
        "winner_offer_status" text null,
        "winner_offer_expires_at" timestamptz null,
        "cascade_position" integer not null default 0,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "auction_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `create index if not exists "IDX_auction_product_id" on "auction" ("product_id") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auction_status" on "auction" ("status") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auction_ends_at" on "auction" ("ends_at") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auction_deleted_at" on "auction" ("deleted_at") where "deleted_at" is null;`
    )

    this.addSql(`
      create table if not exists "auction_bid" (
        "id" text not null,
        "auction_id" text not null,
        "customer_id" text not null,
        "amount" integer not null,
        "status" text not null default 'active',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "auction_bid_pkey" primary key ("id"),
        constraint "auction_bid_auction_fk" foreign key ("auction_id") references "auction" ("id") on update cascade on delete cascade
      );
    `)
    this.addSql(
      `create index if not exists "IDX_auction_bid_auction_id" on "auction_bid" ("auction_id") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auction_bid_customer_id" on "auction_bid" ("customer_id") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auction_bid_deleted_at" on "auction_bid" ("deleted_at") where "deleted_at" is null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "auction_bid" cascade;`)
    this.addSql(`drop table if exists "auction" cascade;`)
  }
}
