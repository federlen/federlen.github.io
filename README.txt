Federico Lenzi website package

Main site: index.html
Mobile/app-optimized reading view: app.html
Current CV: files/CV_Federico_Lenzi.pdf
Privacy notice: privacy.html

Deploy the contents of this folder to the web root for www.federicolenzi.com.

ANALYTICS SETUP
---------------
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
