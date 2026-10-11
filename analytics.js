/* Federico Lenzi website analytics
   Privacy design: no cookies, no localStorage, no persistent visitor ID,
   no full referrer URL, no query string. Events are aggregated server-side. */
(function () {
  "use strict";

  function referrerDomain() {
    if (!document.referrer) return "";
    try {
      var u = new URL(document.referrer);
      if (u.hostname === window.location.hostname) return "";
      return u.hostname.toLowerCase().replace(/^www\./, "");
    } catch (_) {
      return "";
    }
  }

  function cleanEvents(value) {
    return String(value || "")
      .split(",")
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  function send(events) {
    events = cleanEvents(events);
    if (!events.length) return;

    var payload = JSON.stringify({
      events: events,
      path: window.location.pathname,
      referrer_domain: referrerDomain()
    });

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
        navigator.sendBeacon("/__analytics/event", blob);
        return;
      }
    } catch (_) {}

    try {
      fetch("/__analytics/event", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: payload,
        keepalive: true,
        credentials: "omit",
        cache: "no-store"
      }).catch(function () {});
    } catch (_) {}
  }

  function trackActivation(event) {
    var el = event.target && event.target.closest
      ? event.target.closest("a[data-analytics-events],button[data-analytics-events]")
      : null;
    if (!el) return;
    send(el.getAttribute("data-analytics-events"));
  }

  document.addEventListener("click", trackActivation, { capture: true });
  document.addEventListener("auxclick", function (event) {
    if (event.button === 1) trackActivation(event);
  }, { capture: true });
})();
