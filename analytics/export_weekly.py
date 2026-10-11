#!/usr/bin/env python3
"""Export exactly one completed analytics week from Cloudflare D1.

Required environment variables:
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_D1_DATABASE_ID

Each run creates a NEW weekly folder instead of growing master CSV files:
  <output>/<ISO-WEEK>/city_weekly_<ISO-WEEK>.csv
  <output>/<ISO-WEEK>/referral_daily_<ISO-WEEK>.csv
  <output>/<ISO-WEEK>/bots_weekly_<ISO-WEEK>.csv

The referral file still has daily rows, but only for the seven days belonging to
that completed ISO week. Re-running the same week safely replaces that week's
three files rather than appending duplicate rows.
"""

from __future__ import annotations
import csv
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Chicago")

CITY_COLUMNS = [
    "week","country","state_region","city","bot_dummy","total_visits",
    "desktop_visits","phone_visits","tablet_visits","homepage_views","app_views",
    "cv_clicks","cv_downloads","jmp_paper_clicks","jmp_pdf_downloads",
    "downside_paper_clicks","downside_abstract_clicks","downside_pdf_downloads",
    "subnational_income_paper_clicks","subnational_income_abstract_clicks",
    "pedl_policy_note_clicks","pedl_abstract_clicks","google_scholar_clicks",
    "ssrn_clicks","orcid_clicks","linkedin_clicks","privacy_clicks",
    "other_file_downloads","all_downloads"
]

REFERRAL_COLUMNS = [
    "date","referrer_category","referrer_domain","bot_dummy","total_visits",
    "desktop_visits","phone_visits","tablet_visits","homepage_views","app_views",
    "cv_clicks","cv_downloads","jmp_paper_clicks","jmp_pdf_downloads",
    "downside_paper_clicks","downside_abstract_clicks","downside_pdf_downloads",
    "subnational_income_paper_clicks","subnational_income_abstract_clicks",
    "pedl_policy_note_clicks","pedl_abstract_clicks","google_scholar_clicks",
    "ssrn_clicks","orcid_clicks","linkedin_clicks","privacy_clicks",
    "other_file_downloads","all_downloads"
]

BOT_COLUMNS = [
    "week","bot_name","bot_family","verified_bot","user_agent_raw","user_agent_parsed",
    "organization","asn","country","total_requests","unique_paths","homepage_requests",
    "app_requests","privacy_requests","html_requests","pdf_requests","cv_requests",
    "jmp_paper_requests","downside_paper_requests","subnational_income_paper_requests",
    "pedl_policy_note_requests","other_file_requests","asset_requests","robots_txt_requests",
    "sitemap_requests","status_200","status_3xx","status_4xx","status_5xx","first_seen",
    "last_seen","max_requests_per_minute","avg_requests_per_minute","robots_allowed",
    "robots_compliant","suspicious_bot","notes"
]


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def d1_query(sql: str, params: list[str] | None = None) -> list[dict]:
    account = required("CLOUDFLARE_ACCOUNT_ID")
    dbid = required("CLOUDFLARE_D1_DATABASE_ID")
    token = required("CLOUDFLARE_API_TOKEN")
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{dbid}/query"
    payload = json.dumps({"sql": sql, "params": params or []}).encode("utf-8")
    req = Request(url, data=payload, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })
    with urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    if not data.get("success"):
        raise RuntimeError(data)
    result = data.get("result", [])
    if not result:
        return []
    first = result[0]
    if not first.get("success", True):
        raise RuntimeError(first)
    return first.get("results", []) or []


def iso_week_key(d):
    iso = d.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def write_csv(path: Path, columns: list[str], rows: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({c: row.get(c, "") for c in columns})


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "analytics_export")
    out.mkdir(parents=True, exist_ok=True)

    today = datetime.now(TZ).date()
    previous_week_start = today - timedelta(days=today.weekday() + 7)
    previous_week_end = previous_week_start + timedelta(days=6)
    previous_week = iso_week_key(previous_week_start)

    city_rows = d1_query(
        "SELECT * FROM city_weekly WHERE week = ? ORDER BY country,state_region,city,bot_dummy",
        [previous_week],
    )

    referral_rows = d1_query(
        """SELECT * FROM referral_daily
           WHERE date >= ? AND date <= ?
           ORDER BY date,referrer_category,referrer_domain,bot_dummy""",
        [previous_week_start.isoformat(), previous_week_end.isoformat()],
    )

    bot_rows = d1_query(
        """
        SELECT b.*,
               CASE WHEN COUNT(m.minute_bucket) > 0
                    THEN ROUND(1.0 * b.total_requests / COUNT(m.minute_bucket), 4)
                    ELSE 0 END AS avg_requests_per_minute
        FROM bots_weekly b
        LEFT JOIN bot_minute_counts m
          ON b.week=m.week AND b.bot_name=m.bot_name AND b.user_agent_raw=m.user_agent_raw
        WHERE b.week = ?
        GROUP BY b.week,b.bot_name,b.user_agent_raw
        ORDER BY b.bot_family,b.bot_name
        """,
        [previous_week],
    )

    week_dir = out / previous_week
    write_csv(week_dir / f"city_weekly_{previous_week}.csv", CITY_COLUMNS, city_rows)
    write_csv(week_dir / f"referral_daily_{previous_week}.csv", REFERRAL_COLUMNS, referral_rows)
    write_csv(week_dir / f"bots_weekly_{previous_week}.csv", BOT_COLUMNS, bot_rows)
    (out / "export_week.txt").write_text(previous_week + "\n", encoding="utf-8")

    print(
        f"Exported {previous_week}: {previous_week_start.isoformat()} through "
        f"{previous_week_end.isoformat()}. Created three new weekly CSV files."
    )


if __name__ == "__main__":
    main()
