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
│   └── apple-app-site-association   # Universal Links (opens shares in the app)
├── s/                # share viewer  →  gpsandareameasure.com/s/?id=<uuid>
│   ├── index.html
│   └── share-config.js             # ← fill in Supabase URL + anon key
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
| Web viewer | `s/index.html` + `s/share-config.js` | ✅ (fill in config) |
| Universal Links file | `.well-known/apple-app-site-association` (Team `635LDGUSAA`) | ✅ |
| `Associated Domains` entitlement (`applinks:gpsandareameasure.com`) | [`AreaMeasure.entitlements`](../AreaMeasure.entitlements) | ✅ |
| Link builder + incoming-link parser | [`AppLinks.swift`](../AreaMeasure/Services/AppLinks.swift) (`shareURL(id:)`, `shareID(from:)`) | ✅ |

### To finish (one-time)

1. **Apply the migration** — `supabase db push` (or run `0005_public_shares.sql` in the SQL editor).
2. **Fill `s/share-config.js`** with your `SUPABASE_URL`, `SUPABASE_ANON_KEY` (same as `Config.xcconfig`),
   and the App Store URL once published. (The anon key is safe to commit — RLS protects the data.)
3. **In Xcode**, confirm the **Associated Domains** capability is on (the entitlement is already set).
4. **App wiring (not yet built):**
   - *Create a share* — call the `create_public_share` RPC with the measurement id, get back the share
     uuid, then build the link with `AppLinks.shareURL(id:)` and present the iOS share sheet.
   - *Open an incoming share* — in `onOpenURL`, use `AppLinks.shareID(from:)` and navigate to that item.

### Verifying Universal Links

After Pages is live with HTTPS, the file must be reachable with **no redirect**:

```sh
curl -sI https://gpsandareameasure.com/.well-known/apple-app-site-association
```

Then test Apple's validator: `https://app-site-association.cdn-apple.com/a/v1/gpsandareameasure.com`.

> ⚠️ GitHub Pages serves the AASA file as `application/octet-stream`, which Apple's CDN accepts in
> practice. If a device refuses to associate, host on **Cloudflare Pages / Netlify / Vercel** instead
> and set `Content-Type: application/json` for that path — same files, one config line.
