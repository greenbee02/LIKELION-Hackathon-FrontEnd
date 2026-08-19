## Working Principles (Karpathy)

- State assumptions explicitly. If multiple interpretations exist, surface them — don't pick silently. If something is unclear, stop and ask.
- Push back when warranted. If the user's ask has a flaw or a simpler path exists, say so — don't just comply.
- Convert imperative tasks ("add X", "fix Y") into verifiable goals (test that fails → make it pass; tests green before AND after refactor).
- For multi-step work, decompose as `1. step → verify: check` and execute step by step.

## Product

**Curio** — a service that turns luxury purchases into collectible **cards**. Scanning a receipt QR after a purchase issues a digital card; there is no physical card. The card is the single medium linking purchase record, product info, authenticity, warranty/care, SNS sharing, and rewards. Full brief: `dev/active/product-brief.md`.

**This is a multi-brand platform, not any one brand's app.** MCM is the demo brand, one of several. Nothing in the app's chrome, palette, copy, or type system may belong to a specific brand — a brand's name, colours, and monogram travel with its cards as data. Onboarding a brand is a data change, never a design-system change.

The name `Curio` appears where the platform speaks for itself (splash, auth, profile, share, empty states) and never where a brand does (a card, its detail view, its rewards). Set in `app.config.js` and `package.json`.

## Stack

Expo SDK 57 + Expo Router + React Native 0.86 + React Native Web + TypeScript. One codebase runs in Expo Go, native development builds, and the web export. Routes live in `src/app/`, `@/*` resolves to `src/*`.

- Animation: Reanimated. Gestures: Gesture Handler, or the core responder system where simpler.
- Persistence: AsyncStorage behind a swappable store layer.
- Icons: **lucide-react-native only.** Never `@expo/vector-icons`.
- Headless primitives: **`@rn-primitives/*` only.** Radix UI proper is DOM-only — never install `@radix-ui/react-*`.
- Blur: `expo-blur` everywhere, `expo-glass-effect` on iOS 26+, degrading to `expo-blur`.
- Web is secondary to the phone demo, but every screen must remain usable on React Native Web.

## Design

**Never write a raw value where a token exists.**

- **Colour** — `src/theme/colors.ts`, Radix 12-step gray. No hex in a component. Steps carry the meaning: 1–2 backgrounds, 3–5 interactive fills, 6–8 borders, 9–10 solid fills, 11–12 text. **Text is 11 or 12, never lighter.** Missing role → add it to the token file, don't import `scale` twice.
- **Type** — `src/theme/typography.ts`, roles only (`display` `title` `heading` `body` `action` `label` `caption`), never a raw `fontSize`. `action` is a control's own name; `label` annotates something else.
- **Spacing** — `src/theme/spacing.ts`, 4pt scale (`space[1]`…`space[7]` = 4·8·12·16·24·32·48). Screen gutters 16, card inner padding 12, unrelated sections 32 apart.
- **Radius** — `src/theme/radius.ts`. `base` (12) is the default; `full` for pills and circles; `small` (4) under ~28pt. Three values — if something seems to need a fourth, say so rather than writing a number at the call site.
- **Motion** — `src/theme/motion.ts`. Never pick a duration at a call site.
- **Every word on screen is Korean** — labels, buttons, placeholders, validation, empty states, toasts, tab titles, a11y labels. Copy is written inline at each call site; nothing is centralised for translation. The one exception is the wordmark `Curio`, which is a name.
- **No dark mode.** Light only — `grayDark` is deliberately not imported.
- **Every screen that loads data has three states: skeleton → loaded, or empty.** Never a spinner or a blank screen where a skeleton belongs.
- **A row with no value is not rendered.** No dash, no placeholder — the live API returns null for many fields.
- **Error states carry no colour**, because the palette has none. An invalid field says so three ways at once: border steps to 8, an icon appears, the message sits at step 12 rather than the muted 11.
- **Controls are 52pt tall**, which is what `radius.base` was measured against.
- Behaviour comes from `@rn-primitives/*`, appearance from us.
- Surfaces that float over content use **iOS-style glass** — crisp and near-white, not a heavy frost. Content under it must stay readable.
- **`src/components/brand-marks/` is the only place a hex value may live.** Colour that belongs to someone else — Google's four, Apple's black, a card brand's `Brand.accent` — lives as data.

### Components

Every screen is built from `src/components/ui/`. If a screen needs something not there, it goes there first.

- `Screen` — safe area, background, the 16pt gutter. `gutter={false}` is the only escape and stays a boolean.
- `Text` — the only way a word reaches the screen. `variant` (type role) + `tone` (`default` 12 / `muted` 11 / `inverted` 1). No size prop, no fourth tone.
- `Button` — `solid` and `outline` only. A screen with two equally loud buttons has not decided what it is for.
- `Input` · `Checkbox` · `Badge` · `ProgressBar` · `EmptyState` · `Toast` · `Dropdown`.
- `IconButton` — the only icon-only control, 40pt, `radius.full`. `variant="glass"` for back arrows and the scan button.
- `GlassSurface` — the one implementation of glass. Anything that floats keeps the shadow; a surface fused to the screen's edges takes `shadow={false}` and `corners="top"`.
- `Dialog` — for what cannot be undone. Controlled, not triggered; the only floating surface with a scrim; buttons stacked, and **the safe answer is the `solid` one**.
- `Sheet` — detail that belongs to a screen but is not what the screen is about. End content with `useSheetSpace()`.
- Card components live in `src/components/card/`; `CardFace` is reused at every size rather than re-specified per screen.
- **The tab bar is ours** (`src/components/navigation/tab-bar.tsx`), not `tabBarStyle`. Every scrolling tab screen ends its content with `useTabBarSpace()`.

### Motion

Three motions, all defined in `src/theme/motion.ts`:

- **Press**, via `usePressScale()` — a control grows 16% while held, 90ms in / 160ms out, decelerating both ways.
- **Flip** — 420ms, easing in *and* out, over a 900 perspective. The card only.
- **Sheet** — 260ms on the press curve.

Two call-site obligations, exported beside the hook:

- **`allowPressOverflow`** on every container the growth passes through. RN Web defaults `View` to `overflow: hidden` where native gives `visible`, so a control that grows is fine on a phone and quietly loses a corner on web. Not global: glass clips its blur, a card clips its artwork.
- **`raiseWhilePressed`** on anything that can grow past a sibling — siblings paint in source order.

A scroll view clips at its own edge and no overflow rule reaches it, so a list whose items grow carries the gutter in `contentContainerStyle` and takes `Screen gutter={false}`.

`Checkbox` and text links are deliberately excluded from press growth.

### Auth

`AuthProvider` (`src/lib/auth-store.tsx`) holds `restoring | signed-out | signed-in`; the gate in `src/app/_layout.tsx` redirects on it and holds the splash until it resolves, so neither a returning nor a new customer flashes the wrong screen.

```
/sign-in            wordmark · 구글로 로그인 · 애플로 로그인 · [이메일 가입 | 이메일 로그인]
  └ /sign-in/email  이메일 + 비밀번호 · [이메일 찾기 | 비밀번호 재설정]
      └ /sign-up    이메일 · 비밀번호 · 필수 약관 3건
```

Google is wired to `signInWithProvider`; Apple is a stub, and is not optional once any social provider ships (App Store 4.8). Provider button colours come from `brand-marks/palettes.ts` through `Button`'s `palette` prop. 이메일 찾기 and 비밀번호 재설정 are design only — no endpoint exists.

**The wordmark is set in Titillium Web and nothing else is** — the `wordmark` role, on `/sign-in` alone. Import the weight subpath (`@expo-google-fonts/titillium-web/700Bold`), never the package root, which pulls all 22 faces into the bundle.

### The card

The face carries **two lines of type along the top and nothing else** — the city in caps with the purchase date under it on the left, the house's mark on the right. The product's name is not on the face; it goes in the caption under it.

- **Artwork is generated.** `cardArtSource()` resolves the backend URL first and the bundled mock only when there is none. Prompt: `dev/active/card-art-prompt.md`.
- **A brand's mark travels as data** — `Brand.logoUrl` via `brandMarkSource()`, knocked out to white. Never drawn by hand. A brand without a mark signs with its name set in type; that is a supported state, not a gap.
- The top-band scrim is an SVG gradient (`react-native-svg`), not stacked translucent bands, which would visibly band against a sky.
- **`type.engraving` is the city and nothing else** — Cormorant Garamond SemiBold, the second and last exception to the platform font.
- `colors.glassFill` / `glassEdge` / `glassShadow` / `scrimInk` are the only token entries that are not a step on the gray scale.
- **Dates are formatted fixed** (`2026.07.14`), never `toLocaleDateString` — locale output changes width between devices and breaks grid alignment.

## Deployment

**`npx vercel --prod` from the repo root.** Project `curio`, already linked; `.vercel/` is ignored. Live at `https://curio-xi-lovat.vercel.app`.

**Nothing deploys on push**, and no permission change fixes that: a GitHub App installs on an *account*, never on a repo, and this repo belongs to someone else's personal account. `vercel link` attempts the connection and is refused — expected, harmless. Shipping is a command somebody runs.

- **`web.output` is `single`, not `static`.** Static rendering spells a dynamic segment `dist/card/[id].html`, which static hosting cannot resolve; the deep link then falls through the catch-all onto the wrong screen's markup.
- **`vercel.json`'s rewrites are the web's only route to the backend** — `/api/`, `/images/`, `/generated/`, the same three prefixes `metro.config.js` proxies in dev. Needed twice over: the backend sends no CORS headers, and HTTPS→HTTP would be cut as mixed content even if CORS opened. So `src/lib/config.ts` proxies on web unconditionally, with no `__DEV__` in the condition.
- **The backend address is written twice** — `.env` and `vercel.json`, which is static JSON and cannot read an environment variable. Moving the server means editing both; forgetting the second breaks the deployed web only.
- **Set the env vars on the Vercel project as well as in `.env`.** `USE_MOCK` reads `!== 'false'`, so an *absent* variable ships mock data.
- **`vercel link` adds `.env*` to `.gitignore` — delete that line.** It swallows `.env`, which holds an address rather than a secret. Keep `.vercel` and the existing `.env*.local`.
- **Verify with `curl`, not a browser** — `/` and a deep link for the SPA fallback; a proxied path against the same path called on the backend directly (identical status = faithful proxy); the entry bundle grepped for a mock-only string to prove which mode shipped.

## Current Scope

- I own the **frontend**. The backend is live at `http://1.201.117.14` (`/api/v1`) and the app is wired to it. `dev/active/backend-integration-plan.md` is the authority on what a screen can actually have — every endpoint, every place the real response differs from what the frontend assumed, and what is blocked. `dev/active/db-schema-draft.md` is the database read off the Flyway migrations; a column existing there does not mean the API returns it.
- **Mock and live are one switch: `EXPO_PUBLIC_USE_MOCK` in `.env`**, read only by `src/lib/config.ts`. One switch, so a half-live state cannot exist.
- **A card is completed by its product.** `CardResponse.product` carries six fields and no brand, so `hydrateCard()` fetches `GET /products/{id}` — public, cached per product. `brands.logo_url` exists in the schema but no DTO exposes it.
- **Card customization is AI-generated, not preset.** Generation is async (202 + `PENDING`) with no push channel, so the frontend polls `GET /cards/{id}/ai-resources`. The waiting state is part of the design.
- Design is **mobile-first** — native phone screens are primary, web is the same app widened.
- **Write decisions here as they land — rules only.** Not implementation records: if it explains why an existing screen looks the way it does rather than constraining the next one, it belongs in `dev/active/`, not here.
