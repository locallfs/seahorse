import { Migration } from "@mikro-orm/migrations"

export class Migration20260723100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "quickbooks_ledger_baseline" (
        "id" text not null,
        "paired_count" integer not null,
        "code_bearing_count" integer not null,
        "variant_count" integer not null,
        "qbo_item_count" integer not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "quickbooks_ledger_baseline_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `create index if not exists "IDX_qb_ledger_baseline_created_at" on "quickbooks_ledger_baseline" ("created_at");`
    )
    this.addSql(
      `create index if not exists "IDX_qb_ledger_baseline_deleted_at" on "quickbooks_ledger_baseline" ("deleted_at") where "deleted_at" is null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "quickbooks_ledger_baseline" cascade;`)
  }
}
