Federico Lenzi website package

PUBLIC SITE
-----------
Canonical public URL: https://federicolenzi.com/
GitHub Pages repository: https://github.com/federlen/federlen.github.io
Main site: index.html
Mobile/app-optimized reading view: app.html
Current CV: files/CV_Federico_Lenzi.pdf
Privacy notice: privacy.html

Deploy the contents of this folder to the web root for federicolenzi.com (non-www).
The GitHub Pages CNAME should be: federicolenzi.com

SEO / SITE IDENTITY
-------------------
The homepage uses one canonical hostname everywhere: https://federicolenzi.com/
The page title is: Federico Lenzi | Finance PhD Candidate at Kellogg
The homepage includes a descriptive meta description, Open Graph metadata, and WebSite structured data naming the site "Federico Lenzi".
robots.txt and sitemap.xml should also use the non-www hostname.

FAVICON / APP ICON FORMATS
--------------------------
favicon.ico          48x48 legacy/search-engine/browser fallback
favicon.svg          scalable FL favicon (letters already converted to SVG paths)
icon-192.png         192x192 PNG app/browser icon
icon-512.png         512x512 PNG app icon
apple-touch-icon.png 180x180 Apple touch icon
site.webmanifest     web-app metadata

ANALYTICS PRIVACY DESIGN
------------------------
The analytics implementation uses no analytics cookies, no localStorage/sessionStorage identifier, no persistent visitor ID, no full referrer URL, and no query-string storage. Events are aggregated server-side.

This version contains the privacy-preserving analytics implementation for three aligned datasets:
1) city_weekly_<ISO-WEEK>.csv
2) referral_daily_<ISO-WEEK>.csv
3) bots_weekly_<ISO-WEEK>.csv

The CSVs are exported every Monday to a separate PRIVATE GitHub repository.
There are no ever-growing master CSVs. Each completed week gets its own folder and three small CSV files.

See analytics/SETUP.md and analytics/CODEBOOK.md before deployment.

WEEKLY PRIVATE ANALYTICS FILES
------------------------------
The analytics workflow does NOT append indefinitely to one large CSV.
Each completed week creates a NEW private directory in the separate private
analytics repository, for example:

  website-analytics/2026-W42/
    city_weekly_2026-W42.csv
    referral_daily_2026-W42.csv
    bots_weekly_2026-W42.csv

The next week is saved in website-analytics/2026-W43/, and so on.
This keeps every CSV small and easy to open.
