# Website analytics codebook

This implementation stores aggregate analytics rather than individual visitor histories.
No analytics cookie, localStorage identifier, persistent visitor ID, full referrer URL,
search query, or raw IP is stored by this code.

## Weekly file storage

The private analytics repository does **not** maintain ever-growing master CSV files.
Every Monday a new folder is created for the fully completed Monday-Sunday ISO week:

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

Re-running the workflow for the same week replaces only that week's three files.
It does not append duplicate observations and it does not create a growing master file.

## 1. city_weekly_<week>.csv

Unit: `week x country x state_region x city x bot_dummy`.

Literal variable order:

```text
week
country
state_region
city
bot_dummy
total_visits
desktop_visits
phone_visits
tablet_visits
homepage_views
app_views
cv_clicks
cv_downloads
jmp_paper_clicks
jmp_pdf_downloads
jmp_abstract_clicks
downside_paper_clicks
downside_abstract_clicks
downside_pdf_downloads
subnational_income_paper_clicks
subnational_income_abstract_clicks
pedl_policy_note_clicks
pedl_abstract_clicks
google_scholar_clicks
ssrn_clicks
orcid_clicks
linkedin_clicks
privacy_clicks
other_file_downloads
all_downloads
```

Definitions:
- `week`: ISO week, e.g. `2026-W42`.
- `country`, `state_region`, `city`: approximate geography derived transiently by Cloudflare; raw IP is not written to D1.
- `bot_dummy`: `0` likely human, `1` bot/crawler.
- `total_visits`: top-level loads of `/`, `/index.html`, or `/app.html`.
- `desktop_visits`, `phone_visits`, `tablet_visits`: visits by broad device class only.
- `homepage_views`, `app_views`: views of the main homepage and app/mobile reading page.
- `cv_clicks`: clicks on a CV link.
- `cv_downloads`: CV download/open-link activations.
- `jmp_paper_clicks`: clicks on the JMP paper button.
- `jmp_pdf_downloads`: JMP PDF/download-link activations.
- `jmp_abstract_clicks`: clicks opening the JMP abstract.
- `downside_paper_clicks`: clicks on the Downside-Risk Sharing paper link.
- `downside_abstract_clicks`: clicks opening its abstract.
- `downside_pdf_downloads`: Downside PDF download/open-link activations.
- `subnational_income_paper_clicks`: clicks on the Subnational Income / WBER paper link.
- `subnational_income_abstract_clicks`: clicks opening its abstract.
- `pedl_policy_note_clicks`: clicks on What Reduces Frictions in Trade Finance? / PEDL policy-note link.
- `pedl_abstract_clicks`: clicks opening its abstract.
- `google_scholar_clicks`, `ssrn_clicks`, `orcid_clicks`, `linkedin_clicks`: clicks on those profile links only.
- `privacy_clicks`: clicks on Privacy & Analytics.
- `other_file_downloads`: any other tagged file download/open-link activation.
- `all_downloads`: sum of the download/open-link activation events.

## 2. referral_daily_<week>.csv

Unit: `date x referrer_category x referrer_domain x bot_dummy`.

This file contains the seven daily dates belonging to the exported week. It is saved once
per week inside that week's folder.

Literal variable order:

```text
date
referrer_category
referrer_domain
bot_dummy
total_visits
desktop_visits
phone_visits
tablet_visits
homepage_views
app_views
cv_clicks
cv_downloads
jmp_paper_clicks
jmp_pdf_downloads
jmp_abstract_clicks
downside_paper_clicks
downside_abstract_clicks
downside_pdf_downloads
subnational_income_paper_clicks
subnational_income_abstract_clicks
pedl_policy_note_clicks
pedl_abstract_clicks
google_scholar_clicks
ssrn_clicks
orcid_clicks
linkedin_clicks
privacy_clicks
other_file_downloads
all_downloads
```

Metric definitions are identical to the city file; only the grouping changes.
Only the referrer hostname/domain is retained. Full referring URLs and query strings are not stored.

Referrer categories:
- `Direct`
- `Google Search`
- `Google Scholar`
- `SSRN`
- `Northwestern/Kellogg`
- `AEA/JOE`
- `EconJobMarket`
- `LinkedIn`
- `X/Twitter`
- `Conference`
- `Publisher/Journal`
- `Coauthor Website`
- `Other`

## 3. bots_weekly_<week>.csv

Unit: `week x bot_name x user_agent_raw`.

The bot content fields are aligned to the same research items used in the human datasets;
the old railroad/publication generic names have been removed.

Literal variable order:

```text
week
bot_name
bot_family
verified_bot
user_agent_raw
user_agent_parsed
organization
asn
country
total_requests
unique_paths
homepage_requests
app_requests
privacy_requests
html_requests
pdf_requests
cv_requests
jmp_paper_requests
downside_paper_requests
subnational_income_paper_requests
pedl_policy_note_requests
other_file_requests
asset_requests
robots_txt_requests
sitemap_requests
status_200
status_3xx
status_4xx
status_5xx
first_seen
last_seen
max_requests_per_minute
avg_requests_per_minute
robots_allowed
robots_compliant
suspicious_bot
notes
```

Definitions:
- `bot_name`: parsed crawler name such as Googlebot, Bingbot, GPTBot, ClaudeBot, Applebot, or UnknownBot.
- `bot_family`: `search_engine`, `ai_crawler`, `social_preview`, `seo_crawler`, `monitoring`, `academic_crawler`, `archive_crawler`, `unknown_bot`, or `suspicious_automation` where applicable.
- `verified_bot`: 1 only when a bot-verification signal is available; otherwise 0.
- `user_agent_raw`, `user_agent_parsed`: raw and simplified crawler identity.
- `organization`, `asn`, `country`: technical/network metadata where available; raw IP is not retained.
- `total_requests`, `unique_paths`: request volume and distinct paths.
- `homepage_requests`, `app_requests`, `privacy_requests`: requests for those site pages.
- `html_requests`, `pdf_requests`: broad request types.
- `cv_requests`: requests for the CV file on your site.
- `jmp_paper_requests`: requests for a locally routed JMP paper resource if one exists. External Dropbox traffic cannot be observed after leaving your domain.
- `downside_paper_requests`: requests for the Downside-Risk Sharing paper resource on your domain.
- `subnational_income_paper_requests`: requests matching a locally routed Subnational Income/WBER resource if one exists.
- `pedl_policy_note_requests`: requests matching a locally routed PEDL policy-note resource if one exists.
- `other_file_requests`: other file/PDF requests.
- `asset_requests`: CSS, image, favicon and other asset requests.
- `robots_txt_requests`, `sitemap_requests`: crawler discovery requests.
- `status_200`, `status_3xx`, `status_4xx`, `status_5xx`: response status groups.
- `first_seen`, `last_seen`: first/last request in the exported week.
- `max_requests_per_minute`, `avg_requests_per_minute`: request intensity.
- `robots_allowed`, `robots_compliant`: robots-rule indicators.
- `suspicious_bot`: 1 for suspicious/unverified automation under the classifier.
- `notes`: classifier notes.

## Event names in the HTML

```text
cv_click
cv_download
jmp_paper
jmp_pdf_download
downside_paper
downside_abstract
downside_pdf_download
subnational_income_paper
subnational_income_abstract
pedl_policy_note
pedl_abstract
google_scholar
ssrn
orcid
linkedin
privacy
other_download
```

These event names are stable even if visible button labels change later.

## Consistency checks

For each completed week, after filtering `bot_dummy == 0`:
- sum of `city_weekly_<week>.total_visits` should equal the sum of the seven days in `referral_daily_<week>.total_visits` across all referrers;
- the same weekly equality should hold for each click/download field because the same event updates both aggregate tables.

Bot diagnostic traffic is separately available in `bots_weekly_<week>.csv`.
