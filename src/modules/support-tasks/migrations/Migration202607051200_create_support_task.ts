import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration202607051200 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "support_task" ("id" text not null, "title" text not null, "summary" text null, "status" text check ("status" in ('open', 'in_progress', 'waiting_customer', 'resolved')) not null default 'open', "priority" text check ("priority" in ('low', 'normal', 'high', 'urgent')) not null default 'normal', "category" text check ("category" in ('refund', 'exchange', 'delivery', 'subscription', 'vip_followup')) not null, "channel" text null, "due_at" timestamptz null, "snoozed_until" timestamptz null, "resolved_at" timestamptz null, "resolution_note" text null, "customer_id" text null, "customer_name" text null, "customer_email" text null, "source_type" text null, "source_id" text null, "assignee_admin_user_id" text null, "tags" jsonb null, "metadata" jsonb null, "created_by_admin_id" text null, "updated_by_admin_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "support_task_pkey" primary key ("id"));`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_support_task_status" ON "support_task" ("status") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_support_task_assignee_admin_user_id" ON "support_task" ("assignee_admin_user_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_support_task_deleted_at" ON "support_task" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "support_task" cascade;`)
  }
}
