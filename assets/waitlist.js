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

  // Localized waitlist messages, keyed by <html lang>. Falls back to English.
  const STR = {
    en: { invalid: "Please enter a valid email address.",
          unconfigured: "Waitlist isn’t configured yet. Please email hello@gpsandareameasure.com.",
          adding: "Adding you…",
          ok: "🎉 You’re on the list! We’ll email you when Android is ready.",
          dupe: "✅ You’re already on the list — we’ll be in touch!",
          fail: "Something went wrong. Please try again, or email hello@gpsandareameasure.com.",
          network: "Network error. Please check your connection and try again." },
    fr: { invalid: "Saisissez une adresse e-mail valide.",
          unconfigured: "La liste d'attente n'est pas encore configurée. Écrivez à hello@gpsandareameasure.com.",
          adding: "Ajout en cours…",
          ok: "🎉 Vous êtes sur la liste ! Nous vous écrirons dès qu'Android sera prêt.",
          dupe: "✅ Vous êtes déjà sur la liste — nous vous recontacterons !",
          fail: "Une erreur s'est produite. Réessayez ou écrivez à hello@gpsandareameasure.com.",
          network: "Erreur réseau. Vérifiez votre connexion et réessayez." },
    es: { invalid: "Introduce una dirección de correo válida.",
          unconfigured: "La lista de espera aún no está configurada. Escribe a hello@gpsandareameasure.com.",
          adding: "Añadiéndote…",
          ok: "🎉 ¡Estás en la lista! Te avisaremos por correo cuando Android esté listo.",
          dupe: "✅ Ya estás en la lista — ¡nos pondremos en contacto!",
          fail: "Algo salió mal. Inténtalo de nuevo o escribe a hello@gpsandareameasure.com.",
          network: "Error de red. Revisa tu conexión e inténtalo de nuevo." },
    "pt-BR": { invalid: "Digite um endereço de e-mail válido.",
          unconfigured: "A lista de espera ainda não está configurada. Escreva para hello@gpsandareameasure.com.",
          adding: "Adicionando você…",
          ok: "🎉 Você está na lista! Avisaremos por e-mail quando o Android estiver pronto.",
          dupe: "✅ Você já está na lista — entraremos em contato!",
          fail: "Algo deu errado. Tente novamente ou escreva para hello@gpsandareameasure.com.",
          network: "Erro de rede. Verifique sua conexão e tente novamente." },
    th: { invalid: "โปรดป้อนอีเมลที่ถูกต้อง",
          unconfigured: "ยังไม่ได้ตั้งค่ารายชื่อรอ โปรดส่งอีเมลถึง hello@gpsandareameasure.com",
          adding: "กำลังเพิ่มคุณ…",
          ok: "🎉 คุณอยู่ในรายชื่อแล้ว! เราจะส่งอีเมลหาคุณเมื่อ Android พร้อม",
          dupe: "✅ คุณอยู่ในรายชื่อแล้ว — เราจะติดต่อกลับ!",
          fail: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง หรือส่งอีเมลถึง hello@gpsandareameasure.com",
          network: "เกิดข้อผิดพลาดเครือข่าย โปรดตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง" },
    hi: { invalid: "कृपया एक मान्य ईमेल पता दर्ज करें।",
          unconfigured: "प्रतीक्षा सूची अभी कॉन्फ़िगर नहीं हुई है। कृपया hello@gpsandareameasure.com पर ईमेल करें।",
          adding: "आपको जोड़ रहे हैं…",
          ok: "🎉 आप सूची में हैं! Android तैयार होने पर हम आपको ईमेल करेंगे।",
          dupe: "✅ आप पहले से सूची में हैं — हम संपर्क करेंगे!",
          fail: "कुछ गलत हो गया। कृपया फिर से प्रयास करें, या hello@gpsandareameasure.com पर ईमेल करें।",
          network: "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें और फिर से प्रयास करें।" },
  };
  const L = STR[document.documentElement.lang] || STR.en;

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
      setMsg(L.invalid, "err");
      email.focus();
      return;
    }
    if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("your-project-ref")) {
      setMsg(L.unconfigured, "err");
      return;
    }

    submit.disabled = true;
    setMsg(L.adding, "");
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
        success(L.ok);
      } else if (res.status === 409) {
        success(L.dupe);
      } else {
        const detail = await res.text();
        console.error("waitlist insert failed", res.status, detail);
        setMsg(L.fail, "err");
        submit.disabled = false;
      }
    } catch (err) {
      console.error(err);
      setMsg(L.network, "err");
      submit.disabled = false;
    }
  });

  function success(text) {
    form.hidden = true;
    setMsg(text, "ok");
  }
})();
