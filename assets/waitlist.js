// Android (Google Play) waitlist modal — posts emails to the Supabase `waitlist` table.
// Visitors can only INSERT (see supabase/migrations/0006_waitlist.sql); the list is never readable here.
(function () {
  const cfg = window.SHARE_CONFIG || {};
  const modal = document.getElementById("waitlist-modal");
  const form = document.getElementById("wl-form");
  const email = document.getElementById("wl-email");
  const submit = document.getElementById("wl-submit");
  const msg = document.getElementById("wl-msg");
  if (!modal || !form) return;

  let lastFocused = null;

  function open() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => email.focus(), 50);
    document.addEventListener("keydown", onKey);
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (lastFocused) lastFocused.focus();
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  document.querySelectorAll("[data-waitlist-open]").forEach(b => b.addEventListener("click", open));
  document.querySelectorAll("[data-waitlist-close]").forEach(b => b.addEventListener("click", close));
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  function setMsg(text, kind) {
    msg.textContent = text;
    msg.className = "wl-msg" + (kind ? " " + kind : "");
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const value = email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setMsg("Please enter a valid email address.", "err");
      email.focus();
      return;
    }
    if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("your-project-ref")) {
      setMsg("Waitlist isn’t configured yet. Please email hello@gpsandareameasure.com.", "err");
      return;
    }

    submit.disabled = true;
    setMsg("Adding you…", "");
    try {
      const res = await fetch(cfg.SUPABASE_URL + "/rest/v1/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.SUPABASE_ANON_KEY,
          Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          email: value,
          platform: "android",
          source: "landing",
          user_agent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        success("🎉 You’re on the list! We’ll email you when Android is ready.");
      } else if (res.status === 409) {
        success("✅ You’re already on the list — we’ll be in touch!");
      } else {
        const detail = await res.text();
        console.error("waitlist insert failed", res.status, detail);
        setMsg("Something went wrong. Please try again, or email hello@gpsandareameasure.com.", "err");
        submit.disabled = false;
      }
    } catch (err) {
      console.error(err);
      setMsg("Network error. Please check your connection and try again.", "err");
      submit.disabled = false;
    }
  });

  function success(text) {
    form.hidden = true;
    setMsg(text, "ok");
  }
})();
