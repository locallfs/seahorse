import { Migration } from "@mikro-orm/migrations"

export class Migration20260706000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "quickbooks_sync_log" (
        "id" text not null,
        "direction" text not null,
        "entity_type" text not null default 'item',
        "sku" text null,
        "qbo_item_id" text null,
        "status" text not null,
        "error_message" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "quickbooks_sync_log_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `create index if not exists "IDX_quickbooks_sync_log_deleted_at" on "quickbooks_sync_log" ("deleted_at") where "deleted_at" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_quickbooks_sync_log_created_at" on "quickbooks_sync_log" ("created_at");`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "quickbooks_sync_log" cascade;`)
  }
}
