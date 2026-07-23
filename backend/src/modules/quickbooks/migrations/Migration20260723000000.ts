import { Migration } from "@mikro-orm/migrations"

export class Migration20260723000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "quickbooks_item_map" (
        "id" text not null,
        "variant_id" text not null,
        "qbo_item_id" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "quickbooks_item_map_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `create unique index if not exists "IDX_quickbooks_item_map_variant" on "quickbooks_item_map" ("variant_id") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_quickbooks_item_map_qbo_item" on "quickbooks_item_map" ("qbo_item_id") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_quickbooks_item_map_deleted_at" on "quickbooks_item_map" ("deleted_at") where "deleted_at" is null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "quickbooks_item_map" cascade;`)
  }
}
