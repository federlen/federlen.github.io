/*
  Cloudflare Worker route for federicolenzi.com.
  - Runs in front of the existing GitHub Pages origin.
  - Stores aggregate human analytics only; no raw IP is written to D1.
  - Stores richer technical aggregates for bot/crawler traffic.
  - Requires a D1 binding named DB.
*/

const SITE_TIMEZONE = "America/Chicago";
const OWN_HOSTS = new Set(["federicolenzi.com", "www.federicolenzi.com"]);

const EVENT_COLUMNS = {
  cv_click: ["cv_clicks"],
  cv_download: ["cv_downloads", "all_downloads"],
  jmp_paper: ["jmp_paper_clicks"],
  jmp_pdf_download: ["jmp_pdf_downloads", "all_downloads"],
  jmp_abstract: ["jmp_abstract_clicks"],
  downside_paper: ["downside_paper_clicks"],
  downside_abstract: ["downside_abstract_clicks"],
  downside_pdf_download: ["downside_pdf_downloads", "all_downloads"],
  subnational_income_paper: ["subnational_income_paper_clicks"],
  subnational_income_abstract: ["subnational_income_abstract_clicks"],
  pedl_policy_note: ["pedl_policy_note_clicks"],
  pedl_abstract: ["pedl_abstract_clicks"],
  google_scholar: ["google_scholar_clicks"],
  ssrn: ["ssrn_clicks"],
  orcid: ["orcid_clicks"],
  linkedin: ["linkedin_clicks"],
  privacy: ["privacy_clicks"],
  other_download: ["other_file_downloads", "all_downloads"]
};

function chicagoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const o = {};
  for (const p of parts) if (p.type !== "literal") o[p.type] = p.value;
  return o;
}

function dateKey(date = new Date()) {
  const p = chicagoParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function minuteKey(date = new Date()) {
  const p = chicagoParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function isoWeekKey(date = new Date()) {
  const p = chicagoParts(date);
  const d = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function cleanGeo(value, fallback = "Unknown") {
  const x = String(value || "").trim();
  return x ? x.slice(0, 120) : fallback;
}

function normalizeHost(raw) {
  if (!raw) return "";
  try {
    const u = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch (_) {
    return "";
  }
}

function referrerFromRequest(request) {
  return normalizeHost(request.headers.get("Referer") || "");
}

function referrerCategory(host) {
  host = normalizeHost(host);
  if (!host || OWN_HOSTS.has(host)) return ["Direct", "direct"];
  if (host.startsWith("scholar.google.")) return ["Google Scholar", host];
  if (host === "google.com" || host.startsWith("google.")) return ["Google Search", host];
  if (host === "ssrn.com" || host.endsWith(".ssrn.com")) return ["SSRN", host];
  if (host === "northwestern.edu" || host.endsWith(".northwestern.edu")) return ["Northwestern/Kellogg", host];
  if (host === "aeaweb.org" || host.endsWith(".aeaweb.org")) return ["AEA/JOE", host];
  if (host === "econjobmarket.org" || host.endsWith(".econjobmarket.org")) return ["EconJobMarket", host];
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return ["LinkedIn", host];
  if (["x.com", "twitter.com", "t.co"].includes(host) || host.endsWith(".twitter.com")) return ["X/Twitter", host];
  if (["afajof.org", "nber.org", "conference.nber.org"].some(x => host === x || host.endsWith(`.${x}`))) return ["Conference", host];
  if (["academic.oup.com", "wiley.com", "onlinelibrary.wiley.com", "sciencedirect.com", "elsevier.com", "springer.com", "cambridge.org", "journals.uchicago.edu"].some(x => host === x || host.endsWith(`.${x}`))) return ["Publisher/Journal", host];
  if (["sites.google.com", "effibenmelech.com", "nicolalimodio.com", "regina-wittenbenbergmoerman.squarespace.com"].some(x => host === x || host.endsWith(`.${x}`))) return ["Coauthor Website", host];
  return ["Other", host];
}

function deviceType(ua) {
  ua = String(ua || "").toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) return "tablet";
  if (/iphone|ipod|android.*mobile|windows phone|mobile/.test(ua)) return "phone";
  return "desktop";
}

function classifyBot(request) {
  const ua = String(request.headers.get("User-Agent") || "");
  const low = ua.toLowerCase();
  const cf = request.cf || {};
  const bm = cf.botManagement || null;
  const cloudflareVerified = !!(bm && bm.verifiedBot);

  const known = [
    [/googlebot/i, "Googlebot", "search_engine"],
    [/bingbot|msnbot/i, "Bingbot", "search_engine"],
    [/oai-searchbot/i, "OAI-SearchBot", "ai_crawler"],
    [/gptbot/i, "GPTBot", "ai_crawler"],
    [/chatgpt-user/i, "ChatGPT-User", "ai_crawler"],
    [/claudebot/i, "ClaudeBot", "ai_crawler"],
    [/claude-user/i, "Claude-User", "ai_crawler"],
    [/applebot/i, "Applebot", "search_engine"],
    [/facebookexternalhit|meta-externalagent/i, "FacebookExternalHit", "social_preview"],
    [/twitterbot/i, "Twitterbot", "social_preview"],
    [/linkedinbot/i, "LinkedInBot", "social_preview"],
    [/ia_archiver|archive\.org_bot/i, "InternetArchiveBot", "archive_crawler"],
    [/semrushbot/i, "SemrushBot", "seo_crawler"],
    [/ahrefsbot/i, "AhrefsBot", "seo_crawler"],
    [/mj12bot/i, "MJ12Bot", "seo_crawler"],
    [/uptimerobot|pingdom|statuscake/i, "MonitoringBot", "monitoring"],
    [/yandexbot/i, "YandexBot", "search_engine"],
    [/baiduspider/i, "Baiduspider", "search_engine"]
  ];

  for (const [re, name, family] of known) {
    if (re.test(ua)) {
      return {
        isBot: true, name, family, ua,
        parsed: name,
        verified: cloudflareVerified ? 1 : 0,
        suspicious: 0,
        notes: cloudflareVerified ? "Cloudflare verified bot" : "Known user-agent pattern"
      };
    }
  }

  if (cloudflareVerified) {
    const cat = String(cf.verifiedBotCategory || "").toLowerCase();
    let family = "unknown_bot";
    if (cat.includes("search")) family = "search_engine";
    else if (cat.includes("monitor")) family = "monitoring";
    else if (cat.includes("preview")) family = "social_preview";
    return {
      isBot: true,
      name: "CloudflareVerifiedBot",
      family,
      ua,
      parsed: "CloudflareVerifiedBot",
      verified: 1,
      suspicious: 0,
      notes: cf.verifiedBotCategory ? `Cloudflare category: ${cf.verifiedBotCategory}` : "Cloudflare verified bot"
    };
  }

  if (/bot|crawler|spider|slurp|scrapy|headless|phantomjs|curl\/|wget\//i.test(low)) {
    return {
      isBot: true,
      name: "UnknownBot",
      family: "unknown_bot",
      ua,
      parsed: "UnknownBot",
      verified: 0,
      suspicious: 1,
      notes: "Generic automation user-agent pattern"
    };
  }

  return { isBot: false, name: "Human", family: "human", ua, parsed: "Human", verified: 0, suspicious: 0, notes: "" };
}

function geo(request) {
  const cf = request.cf || {};
  return {
    country: cleanGeo(cf.country),
    state: cleanGeo(cf.region),
    city: cleanGeo(cf.city),
    organization: cleanGeo(cf.asOrganization),
    asn: cf.asn == null ? "Unknown" : String(cf.asn)
  };
}

function pageKind(pathname) {
  if (pathname === "/" || pathname === "/index.html") return "home";
  if (pathname === "/app.html") return "app";
  return "other";
}

async function ensureCityRow(env, week, g, botDummy) {
  await env.DB.prepare(`
    INSERT INTO city_weekly (week,country,state_region,city,bot_dummy)
    VALUES (?,?,?,?,?)
    ON CONFLICT(week,country,state_region,city,bot_dummy) DO NOTHING
  `).bind(week, g.country, g.state, g.city, botDummy).run();
}

async function ensureReferralRow(env, date, category, domain, botDummy) {
  await env.DB.prepare(`
    INSERT INTO referral_daily (date,referrer_category,referrer_domain,bot_dummy)
    VALUES (?,?,?,?)
    ON CONFLICT(date,referrer_category,referrer_domain,bot_dummy) DO NOTHING
  `).bind(date, category, domain, botDummy).run();
}

async function recordVisit(request, env, isBot) {
  const url = new URL(request.url);
  const kind = pageKind(url.pathname);
  if (request.method !== "GET" || kind === "other") return;

  const now = new Date();
  const week = isoWeekKey(now);
  const date = dateKey(now);
  const g = geo(request);
  const botDummy = isBot ? 1 : 0;
  const device = deviceType(request.headers.get("User-Agent"));
  const [refCategory, refDomain] = referrerCategory(referrerFromRequest(request));

  await ensureCityRow(env, week, g, botDummy);
  await ensureReferralRow(env, date, refCategory, refDomain, botDummy);

  const deviceCol = device === "phone" ? "phone_visits" : device === "tablet" ? "tablet_visits" : "desktop_visits";
  const pageCol = kind === "app" ? "app_views" : "homepage_views";

  await env.DB.prepare(`
    UPDATE city_weekly
    SET total_visits=total_visits+1, ${deviceCol}=${deviceCol}+1, ${pageCol}=${pageCol}+1
    WHERE week=? AND country=? AND state_region=? AND city=? AND bot_dummy=?
  `).bind(week, g.country, g.state, g.city, botDummy).run();

  await env.DB.prepare(`
    UPDATE referral_daily
    SET total_visits=total_visits+1, ${deviceCol}=${deviceCol}+1, ${pageCol}=${pageCol}+1
    WHERE date=? AND referrer_category=? AND referrer_domain=? AND bot_dummy=?
  `).bind(date, refCategory, refDomain, botDummy).run();
}

async function incrementEventColumns(env, request, events, suppliedReferrer, isBot) {
  const now = new Date();
  const week = isoWeekKey(now);
  const date = dateKey(now);
  const g = geo(request);
  const botDummy = isBot ? 1 : 0;
  const [refCategory, refDomain] = referrerCategory(suppliedReferrer || "");

  await ensureCityRow(env, week, g, botDummy);
  await ensureReferralRow(env, date, refCategory, refDomain, botDummy);

  const cols = [];
  for (const event of events) {
    const mapped = EVENT_COLUMNS[event];
    if (mapped) cols.push(...mapped);
  }
  if (!cols.length) return;

  const counts = new Map();
  for (const col of cols) counts.set(col, (counts.get(col) || 0) + 1);
  const setSql = Array.from(counts.entries()).map(([col, n]) => `${col}=${col}+${Number(n)}`).join(", ");

  await env.DB.prepare(`
    UPDATE city_weekly SET ${setSql}
    WHERE week=? AND country=? AND state_region=? AND city=? AND bot_dummy=?
  `).bind(week, g.country, g.state, g.city, botDummy).run();

  await env.DB.prepare(`
    UPDATE referral_daily SET ${setSql}
    WHERE date=? AND referrer_category=? AND referrer_domain=? AND bot_dummy=?
  `).bind(date, refCategory, refDomain, botDummy).run();
}

function botRequestCounters(pathname, status) {
  const c = {
    homepage_requests: 0, app_requests: 0, privacy_requests: 0,
    html_requests: 0, pdf_requests: 0, cv_requests: 0, jmp_paper_requests: 0,
    downside_paper_requests: 0, subnational_income_paper_requests: 0, pedl_policy_note_requests: 0,
    other_file_requests: 0, asset_requests: 0, robots_txt_requests: 0, sitemap_requests: 0,
    status_200: 0, status_3xx: 0, status_4xx: 0, status_5xx: 0
  };

  const p = pathname.toLowerCase();
  if (p === "/" || p === "/index.html") c.homepage_requests++;
  if (p === "/app.html") c.app_requests++;
  if (p === "/privacy.html") c.privacy_requests++;
  if (p === "/robots.txt") c.robots_txt_requests++;
  if (p === "/sitemap.xml") c.sitemap_requests++;

  if (p === "/" || p.endsWith(".html")) c.html_requests++;
  else if (p.endsWith(".pdf")) c.pdf_requests++;
  else c.asset_requests++;

  if (p.endsWith("/files/cv_federico_lenzi.pdf")) c.cv_requests++;
  else if (p.includes("screening_versus_advertising") && p.endsWith(".pdf")) c.jmp_paper_requests++;
  else if (p.includes("downside_risk_sharing") && p.endsWith(".pdf")) c.downside_paper_requests++;
  else if ((p.includes("subnational") || p.includes("covid") || p.includes("wber"))) c.subnational_income_paper_requests++;
  else if ((p.includes("pedl") || p.includes("trade_finance") || p.includes("trade-finance"))) c.pedl_policy_note_requests++;
  else if (p.endsWith(".pdf")) c.other_file_requests++;

  if (status >= 200 && status < 300) c.status_200++;
  else if (status >= 300 && status < 400) c.status_3xx++;
  else if (status >= 400 && status < 500) c.status_4xx++;
  else if (status >= 500) c.status_5xx++;
  return c;
}

async function recordBotRequest(request, response, env, bot) {
  const url = new URL(request.url);
  const now = new Date();
  const week = isoWeekKey(now);
  const nowIso = now.toISOString();
  const minute = minuteKey(now);
  const g = geo(request);
  const ua = bot.ua || "";
  const counters = botRequestCounters(url.pathname, response.status);

  const minuteResult = await env.DB.prepare(`
    INSERT INTO bot_minute_counts (week,bot_name,user_agent_raw,minute_bucket,requests)
    VALUES (?,?,?,?,1)
    ON CONFLICT(week,bot_name,user_agent_raw,minute_bucket)
    DO UPDATE SET requests=requests+1
    RETURNING requests
  `).bind(week, bot.name, ua, minute).first();
  const minuteCount = Number((minuteResult && minuteResult.requests) || 1);

  const pathResult = await env.DB.prepare(`
    INSERT INTO bot_paths_seen (week,bot_name,user_agent_raw,path)
    VALUES (?,?,?,?)
    ON CONFLICT(week,bot_name,user_agent_raw,path) DO NOTHING
  `).bind(week, bot.name, ua, url.pathname).run();
  const newPath = pathResult && pathResult.meta && Number(pathResult.meta.changes || 0) > 0 ? 1 : 0;

  const names = Object.keys(counters);
  const values = names.map(k => counters[k]);
  const insertCols = names.join(",");
  const insertPlaceholders = names.map(() => "?").join(",");
  const updateCounters = names.map(k => `${k}=${k}+excluded.${k}`).join(",");

  await env.DB.prepare(`
    INSERT INTO bots_weekly (
      week,bot_name,bot_family,verified_bot,user_agent_raw,user_agent_parsed,
      organization,asn,country,total_requests,unique_paths,${insertCols},
      first_seen,last_seen,max_requests_per_minute,robots_allowed,robots_compliant,suspicious_bot,notes
    ) VALUES (?,?,?,?,?,?,?,?,?,1,?,${insertPlaceholders},?,?,?,?,1,1,?,?)
    ON CONFLICT(week,bot_name,user_agent_raw) DO UPDATE SET
      total_requests=total_requests+1,
      unique_paths=unique_paths+excluded.unique_paths,
      ${updateCounters},
      last_seen=excluded.last_seen,
      max_requests_per_minute=MAX(max_requests_per_minute,excluded.max_requests_per_minute),
      verified_bot=MAX(verified_bot,excluded.verified_bot),
      suspicious_bot=MAX(suspicious_bot,excluded.suspicious_bot),
      organization=CASE WHEN organization='Unknown' THEN excluded.organization ELSE organization END,
      asn=CASE WHEN asn='Unknown' THEN excluded.asn ELSE asn END,
      country=CASE WHEN country='Unknown' THEN excluded.country ELSE country END
  `).bind(
    week, bot.name, bot.family, bot.verified, ua, bot.parsed,
    g.organization, g.asn, g.country, newPath,
    ...values,
    nowIso, nowIso, minuteCount, bot.suspicious, bot.notes
  ).run();
}

async function handleEvent(request, env, ctx) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch (_) {
    return new Response(null, { status: 204 });
  }

  const events = Array.isArray(body.events) ? body.events.map(String).filter(x => EVENT_COLUMNS[x]) : [];
  if (!events.length) return new Response(null, { status: 204 });

  const bot = classifyBot(request);
  const suppliedReferrer = normalizeHost(body.referrer_domain || "");
  ctx.waitUntil(incrementEventColumns(env, request, events, suppliedReferrer, bot.isBot));
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer"
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    ctx.passThroughOnException();
    const url = new URL(request.url);

    if (url.pathname === "/__analytics/event") {
      return handleEvent(request, env, ctx);
    }

    const bot = classifyBot(request);
    const response = await fetch(request);

    ctx.waitUntil(recordVisit(request, env, bot.isBot));
    if (bot.isBot) ctx.waitUntil(recordBotRequest(request, response, env, bot));

    return response;
  }
};
