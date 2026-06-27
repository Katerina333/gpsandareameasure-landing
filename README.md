# Landing page — gpsandareameasure.com

Static marketing site for the **GPS & Area Measure** iOS app. Plain HTML/CSS, no build
step, no backend. Lives inside the app repo but deploys independently.

```
landing/
├── index.html        # main landing page
├── privacy.html      # privacy policy (required for App Store)
├── terms.html        # terms of use
├── CNAME             # custom domain for GitHub Pages
├── .nojekyll         # disables Jekyll so /.well-known is published
├── .well-known/
│   └── apple-app-site-association   # Universal Links (/s/ shares + /j/ invites open in the app)
├── s/                # share viewer  →  gpsandareameasure.com/s/?id=<uuid>
│   ├── index.html
│   └── share-config.js             # ← fill in Supabase URL + anon key
├── j/                # workspace-invite fallback  →  gpsandareameasure.com/j/?code=<code>
│   └── index.html                  # "get the app" + code; installed apps open in-app instead
└── assets/
    ├── styles.css
    └── favicon.svg
```

## Why this is static (and why you don't need Railway)

The page is just files — there's no server code or database. Static hosts serve it for
**free** with HTTPS and a custom domain. **Railway is for apps with a running backend**, so
it would be a waste here. Only switch to Railway/serverless if you later add server logic
(e.g. storing email signups in a database). Even then, a form service like Formspree keeps
this on free static hosting.

## Deploying with GitHub Pages (free)

A workflow at [`.github/workflows/deploy-landing.yml`](../.github/workflows/deploy-landing.yml)
publishes **only the `landing/` folder** on every push to `main`.

One-time setup:

1. Push these files to `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. The workflow runs and gives you a live URL.

### Point your domain at it

In your domain registrar's DNS for `gpsandareameasure.com`:

| Type  | Host / Name | Value                          |
|-------|-------------|--------------------------------|
| A     | `@`         | `185.199.108.153`              |
| A     | `@`         | `185.199.109.153`              |
| A     | `@`         | `185.199.110.153`              |
| A     | `@`         | `185.199.111.153`              |
| CNAME | `www`       | `<your-github-username>.github.io.` |

Then in **Settings → Pages → Custom domain**, enter `gpsandareameasure.com` and tick
**Enforce HTTPS**. The `CNAME` file in this folder keeps the domain set across deploys.
DNS can take up to ~24h to propagate.

## Alternative hosts (also free, even simpler for a subfolder)

- **Cloudflare Pages / Netlify / Vercel** — connect the repo, set the *root/output directory*
  to `landing`, done. No workflow file needed; they handle the custom domain in their UI.

## Local preview

Just open `index.html` in a browser, or:

```sh
cd landing && python3 -m http.server 8000   # http://localhost:8000
```

## Shareable measurement links (like the competitor's `share.fams.app/...`)

A share link is `https://gpsandareameasure.com/s/?id=<uuid>`. Open it and:

- **No app installed** → the web viewer (`s/index.html`) loads the measurement from Supabase and
  draws it on a satellite map with area / perimeter / distance.
- **App installed** → iOS intercepts the link via **Universal Links** and opens it *in the app*.

### Pieces in this repo

| Piece | Where | Status |
|---|---|---|
| Public snapshot table + secure `create_public_share` RPC | [`supabase/migrations/0005_public_shares.sql`](../supabase/migrations/0005_public_shares.sql) | ✅ |
| Web viewer | `s/index.html` + `s/share-config.js` | ✅ (config filled) |
| Universal Links file | `.well-known/apple-app-site-association` (Team `635LDGUSAA`) | ✅ |
| `Associated Domains` entitlement (`applinks:gpsandareameasure.com`) | [`AreaMeasure.entitlements`](../AreaMeasure.entitlements) | ✅ |
| Link builder + incoming-link parser | [`AppLinks.swift`](../AreaMeasure/Services/AppLinks.swift) (`shareURL(id:)`, `shareID(from:)`) | ✅ |
| *Create a share* app wiring | [`ShareService.swift`](../AreaMeasure/Services/ShareService.swift) + "Share link" in [`SavedItemPreviewSheet.swift`](../AreaMeasure/UI/SavedItemPreviewSheet.swift) | ✅ |
| Android waitlist (landing signup) | [`0006_waitlist.sql`](../supabase/migrations/0006_waitlist.sql) + `assets/waitlist.js` | ✅ |

## Workspace invite links

An invite link is `https://gpsandareameasure.com/j/?code=<code>`. Open it and:

- **No app installed** → `j/index.html` shows a "get the app" page with the code + steps to join.
- **App installed** → iOS intercepts it via **Universal Links** (`/j/*` in the AASA file) and opens the
  app straight to the **Join workspace** sheet with the code prefilled — one tap to join.

| Piece | Where | Status |
|---|---|---|
| `invites` table + `redeem_invite` RPC (validates code/expiry/seat, adds membership) | [`0001_schema.sql`](../supabase/migrations/0001_schema.sql) + [`0003_invite_rpc.sql`](../supabase/migrations/0003_invite_rpc.sql) | ✅ |
| AASA `/j/*` component | `.well-known/apple-app-site-association` | ✅ |
| Web fallback page | `j/index.html` (reuses `s/share-config.js` for the App Store link) | ✅ |
| Link builder + incoming-link parser | [`AppLinks.swift`](../AreaMeasure/Services/AppLinks.swift) (`inviteURL(code:)`, `inviteCode(from:)`) | ✅ |
| Mint invite (owner) | [`ShareInviteSheet.swift`](../AreaMeasure/UI/ShareInviteSheet.swift) — share text now includes the link | ✅ |
| Open link → prefill Join sheet | [`AreaMeasureApp.swift`](../AreaMeasure/App/AreaMeasureApp.swift) → `ImportInbox.pendingInviteCode` → [`JoinWorkspaceSheet.swift`](../AreaMeasure/UI/JoinWorkspaceSheet.swift) `init(initialCode:)` | ✅ |
| Device test (Universal Links don't fire in the simulator) | TestFlight, after `Associated Domains` is on the AppStore provisioning profile | ⏳ |

### To finish (one-time)

1. **Apply the migrations** — `supabase db push` (or run `0005_public_shares.sql` and `0006_waitlist.sql`
   in the SQL editor).
2. **`s/share-config.js`** is filled with the Supabase URL + anon key (safe to commit — RLS protects the
   data); update `APP_STORE_URL` once the app is published.
3. **In Xcode**, confirm the **Associated Domains** capability is on (the entitlement is already set).
4. **App wiring:**
   - *Create a share* — ✅ `ShareService.createShareLink(measurementID:)` calls the `create_public_share`
     RPC, builds the link with `AppLinks.shareURL(id:)`, and the "Share link" action presents the iOS
     share sheet. Requires sign-in + the measurement to have synced.
   - *Open an incoming share* — ⏳ still to wire: in `onOpenURL`, use `AppLinks.shareID(from:)` and
     navigate to that item.

### Verifying Universal Links

After Pages is live with HTTPS, the file must be reachable with **no redirect**:

```sh
curl -sI https://gpsandareameasure.com/.well-known/apple-app-site-association
```

Then test Apple's validator: `https://app-site-association.cdn-apple.com/a/v1/gpsandareameasure.com`.

> ⚠️ GitHub Pages serves the AASA file as `application/octet-stream`, which Apple's CDN accepts in
> practice. If a device refuses to associate, host on **Cloudflare Pages / Netlify / Vercel** instead
> and set `Content-Type: application/json` for that path — same files, one config line.
