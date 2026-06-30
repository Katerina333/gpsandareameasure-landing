/* ============================================================
   Field Maps with Area Measure — analytics + consent + attribution
   ------------------------------------------------------------
   - GA4 via Google Consent Mode v2 (cookies only after consent)
   - Minimal cookie-consent banner (GDPR/UK)
   - Captures UTM source/medium/campaign so we know where
     visitors came from (landing, ads, social, etc.)
   - Tags the App Store button with a campaign token (ct=...) so
     App Store Connect → App Analytics shows installs per channel
   ============================================================ */
(function () {
  "use strict";

  // 1) ----- CONFIG -------------------------------------------------
  // Paste your GA4 Measurement ID here (Admin → Data Streams → Web).
  var GA_ID = "G-E18SVDZBKJ";

  // App Store product URL (canonical, derived from the ASC Apple ID).
  // GATED: the app is not released yet, so this 404s — keep
  // APP_STORE_LIVE = false until it's approved & on the store, then flip
  // to true and redeploy. Buttons stay click-tracked (href "#") until then.
  // UTM/campaign tokens are appended automatically when live.
  var APP_STORE_URL = "https://apps.apple.com/app/id6781432068";
  var APP_STORE_LIVE = false;

  var STORE_KEY = "gam_consent"; // "granted" | "denied"
  var hasRealGA = /^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== "G-XXXXXXXXXX";

  // 2) ----- gtag + Consent Mode v2 default (denied) ----------------
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500
  });
  gtag("js", new Date());

  function loadGA() {
    if (!hasRealGA || window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    gtag("config", GA_ID, { anonymize_ip: true });
  }

  // 3) ----- capture UTM / referrer (where they came from) ----------
  function captureSource() {
    try {
      var p = new URLSearchParams(location.search);
      var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];
      var found = {};
      keys.forEach(function (k) { if (p.get(k)) found[k] = p.get(k); });
      if (Object.keys(found).length) {
        found._ts = Date.now();
        sessionStorage.setItem("gam_src", JSON.stringify(found));
      }
    } catch (e) {}
  }
  function getSource() {
    try { return JSON.parse(sessionStorage.getItem("gam_src") || "{}"); }
    catch (e) { return {}; }
  }

  // 4) ----- consent banner -----------------------------------------
  function applyConsent(granted) {
    gtag("consent", "update", {
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
      analytics_storage: granted ? "granted" : "denied"
    });
    if (granted) loadGA();
  }

  function showBanner() {
    var bar = document.createElement("div");
    bar.className = "consent-bar";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.innerHTML =
      '<p>We use cookies for anonymous analytics to understand how people find and use this site. ' +
      'See our <a href="privacy.html">Privacy Policy</a>.</p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="btn btn-sm consent-decline">Decline</button>' +
      '<button type="button" class="btn btn-sm consent-accept">Accept</button>' +
      "</div>";
    document.body.appendChild(bar);

    bar.querySelector(".consent-accept").addEventListener("click", function () {
      localStorage.setItem(STORE_KEY, "granted");
      applyConsent(true);
      bar.remove();
    });
    bar.querySelector(".consent-decline").addEventListener("click", function () {
      localStorage.setItem(STORE_KEY, "denied");
      applyConsent(false);
      bar.remove();
    });
  }

  // 5) ----- App Store button: track + carry campaign token ---------
  function buildStoreURL() {
    if (!APP_STORE_LIVE || APP_STORE_URL === "#") return "#";
    var src = getSource();
    // Apple App Analytics campaign token (shows in ASC). Falls back
    // to the page's own UTM source, else "website".
    var ct = src.utm_campaign || src.utm_source || "website";
    var sep = APP_STORE_URL.indexOf("?") === -1 ? "?" : "&";
    return APP_STORE_URL + sep + "ct=" + encodeURIComponent(ct.slice(0, 40)) + "&mt=8";
  }

  function track(name, params) {
    if (window.gtag) gtag("event", name, params || {});
  }

  function wireStoreButtons() {
    document.querySelectorAll("[data-app-store]").forEach(function (el) {
      var url = buildStoreURL();
      if (url !== "#") el.setAttribute("href", url);
      el.addEventListener("click", function () {
        var src = getSource();
        track("app_store_click", {
          source: src.utm_source || document.referrer || "direct",
          campaign: src.utm_campaign || "none"
        });
      });
    });
  }

  // 6) ----- engagement events (conversions + navigation) -----------
  function wireEngagement() {
    // Google Play badge → Android waitlist intent
    document.querySelectorAll("[data-waitlist-open]").forEach(function (el) {
      el.addEventListener("click", function () {
        track("google_play_click", {
          platform: "android",
          location: el.closest(".cta-final") ? "footer_cta" : "hero"
        });
      });
    });
    // "Get the app" anchors (header + in-page CTAs)
    document.querySelectorAll('a[href$="#download"]').forEach(function (el) {
      el.addEventListener("click", function () { track("get_app_click"); });
    });
    // Language selection from the dropdown
    document.querySelectorAll(".lang-pop a").forEach(function (el) {
      el.addEventListener("click", function () {
        track("language_change", { language: el.getAttribute("hreflang") || el.textContent.trim() });
      });
    });
  }

  // 7) ----- language dropdown: close on outside click / Escape -----
  function wireLangMenu() {
    var menus = document.querySelectorAll("details.lang-menu");
    if (!menus.length) return;
    document.addEventListener("click", function (e) {
      menus.forEach(function (m) { if (m.open && !m.contains(e.target)) m.open = false; });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") menus.forEach(function (m) { m.open = false; });
    });
  }

  // 8) ----- init ---------------------------------------------------
  captureSource();
  var stored = localStorage.getItem(STORE_KEY);
  if (stored === "granted") applyConsent(true);
  else if (stored === "denied") applyConsent(false);

  function onReady() {
    wireStoreButtons();
    wireEngagement();
    wireLangMenu();
    if (!stored) showBanner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
  else onReady();
})();
