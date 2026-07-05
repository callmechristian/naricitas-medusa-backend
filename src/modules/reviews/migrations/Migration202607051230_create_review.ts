import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration202607051230 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review" ("id" text not null, "product_id" text not null, "rating" int not null, "title" text null, "body" text null, "reviewer_name" text null, "moderation_status" text check ("moderation_status" in ('published', 'pending', 'hidden', 'flagged')) not null default 'published', "hidden_reason" text null, "reply_body" text null, "reply_author_name" text null, "replied_at" timestamptz null, "report_count" int not null default 0, "moderated_by_admin_id" text null, "moderated_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"));`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_product_id" ON "review" ("product_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_moderation_status" ON "review" ("moderation_status") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review" cascade;`)
  }
}
