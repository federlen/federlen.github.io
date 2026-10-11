# Setup: privacy-preserving analytics + separate weekly private CSV files

This package implements the agreed three-dataset architecture. Two cloud-side pieces must be configured once: Cloudflare and a private GitHub repository.

## A. Public website repository

Upload this website folder to the existing GitHub Pages repository as usual.
The public repository contains no analytics CSVs and no secret tokens.

GitHub Pages is static. The Cloudflare Worker runs in front of the existing GitHub Pages origin so it can derive approximate geography transiently, aggregate events, and classify bots without storing raw IP addresses.

## B. Cloudflare setup

1. Put `federicolenzi.com` DNS on Cloudflare if it is not already there.
2. Keep the GitHub Pages DNS target, but make the relevant Cloudflare DNS record(s) proxied.
3. Install Wrangler locally or use Cloudflare's dashboard/CLI.
4. Create a D1 database, for example:

   `npx wrangler d1 create federico-site-analytics`

5. Copy `analytics/wrangler.toml.example` to `analytics/wrangler.toml` and replace `REPLACE_WITH_D1_DATABASE_ID`.
6. Create the tables:

   `npx wrangler d1 execute federico-site-analytics --remote --file=analytics/schema.sql`

7. Deploy the Worker:

   `npx wrangler deploy --config analytics/wrangler.toml`

If you already created a D1 database from an older version of this package but have not started collecting real analytics yet, recreate it from the current `schema.sql` so the aligned bot column names match exactly.

## C. Create the private analytics repository

Create a separate **private** GitHub repository, for example:

`federico-website-analytics-private`

Do not store analytics CSVs inside the public GitHub Pages repository.

There are **no growing master CSVs**. Each Monday the workflow creates a new folder with exactly three files for the previous completed week:

```text
website-analytics/
  2026-W42/
    city_weekly_2026-W42.csv
    referral_daily_2026-W42.csv
    bots_weekly_2026-W42.csv
  2026-W43/
    city_weekly_2026-W43.csv
    referral_daily_2026-W43.csv
    bots_weekly_2026-W43.csv
```

This keeps every CSV small and easy to open. `referral_daily_<week>.csv` contains the daily referral rows for the seven days in that week.

If the workflow is re-run for an already exported week, it updates only that week's three files rather than appending duplicate rows.

## D. GitHub Actions secrets in the PUBLIC website repository

In GitHub: Settings -> Secrets and variables -> Actions, add:

- `CLOUDFLARE_API_TOKEN` — Cloudflare token with D1 Read permission.
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `PRIVATE_ANALYTICS_REPO` — e.g. `YOUR_GITHUB_USERNAME/federico-website-analytics-private`
- `PRIVATE_ANALYTICS_REPO_TOKEN` — a fine-grained GitHub token with Contents read/write permission on that private repository.

Never place those values in HTML, JavaScript, YAML committed as plaintext, or README files.

## E. Weekly schedule

`.github/workflows/weekly_analytics.yml` runs every Monday at 00:17 America/Chicago.
Monday is intentional: it exports the fully completed Monday-Sunday week.
The workflow can also be run manually with `workflow_dispatch`.

The exporter queries only the previous completed week, so it does not download all historical D1 data every Monday.

## F. Privacy and retention

The supplied site uses:
- no analytics cookies;
- no localStorage analytics ID;
- no persistent visitor identifier;
- no full referring URL or query string;
- no raw IP written to analytics storage.

The human tables are updated directly as aggregates. There is no human-level raw event table.

The privacy notice says city-level analytics are deleted after the academic job-market period. Git commits preserve history, so to honor that promise you should delete the private analytics repository (or fully purge the analytics history) after the job-market period, and delete the D1 city table/data as appropriate.

## G. Interpretation of downloads

Human `*_downloads` fields are download/open-link activations, not byte-level proof of a completed external transfer.
The current JMP file is on Dropbox, so `jmp_pdf_downloads` measures clicks that send the visitor to the JMP PDF/download link.

Bot file-request fields are HTTP requests that pass through your website domain. External Dropbox/OUP/CEPR traffic cannot be observed after the bot leaves your domain.
