// Public Supabase credentials for the share viewer.
//
// These are SAFE to commit and ship: the anon key only grants what Row-Level Security allows,
// and `public_shares` is readable by anyone for non-revoked, non-expired rows (see
// supabase/migrations/0005_public_shares.sql). NEVER put the service-role key here.
//
// Fill these in from Supabase → Project Settings → API (same values as Config.xcconfig).
window.SHARE_CONFIG = {
  SUPABASE_URL: "https://zcssolanlqvywedwnoqc.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_H_2PSLjyGx_-fUDo98bM3Q_kLMPor7y",
  // App Store URL used by the "Open in app / Get the app" button (fill once published).
  APP_STORE_URL: "https://apps.apple.com/app/id6781432068",
};
