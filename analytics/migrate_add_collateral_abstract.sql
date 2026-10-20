-- One-time migration for an EXISTING Cloudflare D1 analytics database.
-- Run BEFORE deploying the new Worker and website HTML.
-- Do not drop or recreate tables: existing historical counts are preserved.
-- Command (from repository root):
-- npx wrangler d1 execute federico-site-analytics --remote --file=analytics/migrate_add_collateral_abstract.sql
-- If your database already has this column, do not run again.
ALTER TABLE city_weekly ADD COLUMN collateral_abstract_clicks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referral_daily ADD COLUMN collateral_abstract_clicks INTEGER NOT NULL DEFAULT 0;
