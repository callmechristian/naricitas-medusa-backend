import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration202607051744 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "subscription" add column if not exists "failed_payment_count" int not null default 0;`)
    this.addSql(`alter table "subscription" add column if not exists "last_failure_at" timestamptz null;`)
    this.addSql(`alter table "subscription" add column if not exists "last_failure_reason" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "subscription" drop column if exists "failed_payment_count";`)
    this.addSql(`alter table "subscription" drop column if exists "last_failure_at";`)
    this.addSql(`alter table "subscription" drop column if exists "last_failure_reason";`)
  }
}
