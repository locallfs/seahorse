import { Migration } from "@mikro-orm/migrations"

export class Migration20260418000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "quickbooks_connection" (
        "id" text not null,
        "realm_id" text not null,
        "access_token_encrypted" text not null,
        "refresh_token_encrypted" text not null,
        "access_token_expires_at" timestamptz not null,
        "refresh_token_expires_at" timestamptz null,
        "environment" text not null default 'sandbox',
        "last_error" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "quickbooks_connection_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `create index if not exists "IDX_quickbooks_connection_deleted_at" on "quickbooks_connection" ("deleted_at") where "deleted_at" is null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "quickbooks_connection" cascade;`)
  }
}
