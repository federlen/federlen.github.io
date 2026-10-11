-- Run once ONLY if your D1 database already exists (created from the previous schema.sql).
-- npx wrangler d1 execute federico-site-analytics --remote --file=analytics/migrate_add_jmp_abstract.sql
ALTER TABLE city_weekly ADD COLUMN jmp_abstract_clicks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referral_daily ADD COLUMN jmp_abstract_clicks INTEGER NOT NULL DEFAULT 0;
