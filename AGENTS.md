## Working Principles (Karpathy)

- State assumptions explicitly. If multiple interpretations exist, surface them — don't pick silently. If something is unclear, stop and ask.
- Push back when warranted. If the user's ask has a flaw or a simpler path exists, say so — don't just comply.
- Convert imperative tasks ("add X", "fix Y") into verifiable goals (test that fails → make it pass; tests green before AND after refactor).
- For multi-step work, decompose as `1. step → verify: check` and execute step by step.

## Product

**Curio** turns a luxury purchase into a collectible **card** — a receipt QR is scanned, a digital card is issued, and that card is the one medium carrying purchase record, product, authenticity, warranty/care, sharing, and rewards. There is no physical card. Full brief: `dev/active/product-brief.md`.

**This is a multi-brand platform, not any one brand's app.** MCM is the demo brand, one of several. Nothing in the app's chrome, palette, copy, or type system may belong to a specific brand — a brand's name, colours, and monogram travel with its cards as data. Onboarding a brand is a data change, never a design-system change.

The name `Curio` appears where the platform speaks for itself (splash, auth, profile, share, empty states) and never where a brand does (a card, its detail view, its rewards). Set in `app.config.js` and `package.json`.

## Stack

Expo SDK 57 + Expo Router + React Native 0.86 + React Native Web + TypeScript. One codebase runs in Expo Go, native development builds, and the web export. Routes live in `src/app/`, `@/*` resolves to `src/*`.

- Animation: Reanimated. Gestures: Gesture Handler, or the core responder system where simpler.
- Persistence: AsyncStorage behind a swappable store layer.
- Icons: **lucide-react-native only.** Never `@expo/vector-icons`.
- Headless primitives: **`@rn-primitives/*` only** — behaviour from them, appearance from us. Radix UI proper is DOM-only; never install `@radix-ui/react-*`.
- Blur: `expo-blur` everywhere, `expo-glass-effect` on iOS 26+, degrading to `expo-blur`.
- Design is **mobile-first**: native phone screens are primary, web is the same app widened. Web is secondary to the phone demo, but every screen must remain usable on React Native Web.

## Running it locally

**Start the dev server with the `dev-up` skill** (`.claude/skills/dev-up/`), never a bare `expo start` and never a fixed port. It binds the first free port from 8081 upward, so worktrees run side by side. A bare `expo start` on a busy port does not move to the next one — it prompts, and with no TTY that prompt aborts the command, so the server silently never starts.

- **`--clear` is never the fix.** Metro's transform cache is one directory in `os.tmpdir()` shared by every worktree and every Expo project on the machine, keyed by content rather than by path — a fresh worktree starts warm off another's work, and clearing throws that away for all of them. If a crawl is genuinely stale, delete only the per-worktree `$TMPDIR/metro-file-map-expo-*`.
- **Worktrees live at `.claude/worktrees/<name>`, and `node_modules` is the only thing a fresh one lacks** — `.env` is committed, so nothing has to be copied in.
- **The iOS dev build pins its Metro port at build time** (`ios/Curio/AppDelegate.swift`), and `ios/` is gitignored so it never shows in a diff. A native build takes that port explicitly.
- **A person checks screens; tools hand back URLs.** Verify with `curl`.

## Design

**Never write a raw value where a token exists.**

- **Colour** — `src/theme/colors.ts`, Radix 12-step gray. No hex in a component. Steps carry the meaning: 1–2 backgrounds, 3–5 interactive fills, 6–8 borders, 9–10 solid fills, 11–12 text. **A panel is separated by a border, not a fill** — the page is already step 1, so a filled box can only go darker, and a list of them turns the page gray; `Panel` draws a step-6 hairline and keeps the page's brightness. Steps 3–5 as a surface are for what stands in for something absent (a tile awaiting artwork) or holds one thing up (the claim-code plate). **Text is 11 or 12, never lighter.** Missing role → add it to the token file, don't import `scale` twice.
- **Type** — `src/theme/typography.ts`, roles only (`display` `title` `heading` `body` `action` `label` `caption`), never a raw `fontSize`. `action` is a control's own name; `label` annotates something else.
- **Spacing** — `src/theme/spacing.ts`, 4pt scale (`space[1]`…`space[7]` = 4·8·12·16·24·32·48). Screen gutters 16, card inner padding 12, unrelated sections 32 apart.
- **Radius** — `src/theme/radius.ts`. `base` (12) is the default; `full` for pills and circles; `small` (4) under ~28pt. Three values — if something seems to need a fourth, say so rather than writing a number at the call site.
- **Motion** — `src/theme/motion.ts` defines press, flip, and sheet. Never pick a duration at a call site, and never restate one here.
- **Every word on screen is Korean** — labels, buttons, placeholders, validation, empty states, toasts, tab titles, a11y labels. Copy is written inline at each call site; nothing is centralised for translation. Two exceptions: the wordmark `CURIO`, which is a name, and the `My` tab, which the owner chose in English.
- **No dark mode.** Light only — `grayDark` is deliberately not imported.
- **Every screen that loads data has three states: skeleton → loaded, or empty.** Never a spinner or a blank screen where a skeleton belongs.
- **A row with no value is not rendered.** No dash, no placeholder — the live API returns null for many fields.
- **Error states carry no colour.** The palette has one hue — `colors.point`, the platform's point colour — and it is not for errors. An invalid field says so three ways at once: border steps to 8, an icon appears, the message sits at step 12 rather than the muted 11.
- **Controls are 52pt tall**, which is what `radius.base` was measured against.
- Surfaces that float over content use **iOS-style glass** — crisp and near-white, not a heavy frost. Content under it must stay readable.
- **A hex value may live in two places and nowhere else.** `src/components/brand-marks/`, for colour that belongs
  to someone else — Google's four, Apple's black, a card brand's `Brand.accent` — which lives as data; and
  `colors.point`, the platform's own. **`point` is defined and used nowhere** — a point colour marks the one
  thing on a screen that matters, so a screen that has not decided what that is gets none of it.

### The wordmark

**Set in Jost and nothing else is** — the `wordmark` role, reached only through `Wordmark`, on `/sign-in` alone. Import the weight subpath (`@expo-google-fonts/jost/300Light`), never the package root, which pulls every face into the bundle.

- **The mark is geometric, light, and set in caps, wide.** `C` and `O` are struck from one circle and `R` carries a straight leg; that drawing is what makes it read as stamped rather than typed, and a humanist sans squares the `O` off and collapses it back into a word. Tracking is 0.34em — **caps set tight are a word, caps set open are a mark.**
- **RN applies `letterSpacing` after the last glyph too**, so a centred line of tracked caps is drawn half a track to the left of where the eye puts it. `Wordmark` cancels it with one track of left padding. That is why the mark is a component and why nothing else uses the role directly.
- **The app icon is the same mark in the same face** (`scripts/make-app-icon.py`, Jost 400 — 300's strokes vanish at home-screen size). Change one and change the other: the same name in two faces is two logos.

### Components

Every screen is built from `src/components/ui/`. If a screen needs something not there, it goes there first.

- `Screen` — safe area, background, the 16pt gutter. `gutter={false}` is the only escape and stays a boolean.
- `Text` — the only way a word reaches the screen. `variant` (type role) + `tone` (`default` 12 / `muted` 11 / `inverted` 1). No size prop, no fourth tone.
- `Button` — `solid` and `outline` only. A screen with two equally loud buttons has not decided what it is for.
- `IconButton` — the only icon-only control, 40pt, `radius.full`. `variant="glass"` for back arrows and the scan button. Alongside: `Input` · `Checkbox` · `Badge` · `ProgressBar` · `EmptyState` · `Toast` · `Dropdown`.
- `NavBar` — **every screen with a back button wears one, and it carries that screen's name.** Back at the left edge, the name centred on the *screen* (so it does not shift when the optional right-hand action appears or goes), 52pt tall. The name is the page's, not its subject's: a card detail says 카드 while the product's name stays at 24pt under the card, because a name written twice is a name written once too often. A screen with no way back — a tab — sets its title inline instead.
- `GlassSurface` — the one implementation of glass. Anything that floats keeps the shadow; a surface fused to the screen's edges takes `shadow={false}` and `corners="top"`.
- `Dialog` — for what cannot be undone. Controlled, not triggered; the only floating surface with a scrim; buttons stacked, and **the safe answer is the `solid` one**.
- `Sheet` — detail that belongs to a screen but is not what the screen is about. End content with `useSheetSpace()`. **It is not controlled and does not become controlled**: there is no `open`, it rises by drag or tap, and a screen holds at most one because they share the same bottom edge. **What has to be opened is a route.** Giving `Sheet` an `open` prop would make it a modal, which is what `Dialog` already is.
- Card components live in `src/components/card/`; `CardFace` is reused at every size rather than re-specified per screen.
- **The tab bar is ours** (`src/components/navigation/tab-bar.tsx`), not `tabBarStyle`. Every scrolling tab screen ends its content with `useTabBarSpace()`.

### Press growth, and what it breaks

`usePressScale()` grows a control while held. Two obligations travel with it, exported beside the hook:

- **`allowPressOverflow`** on every container the growth passes through. RN Web defaults `View` to `overflow: hidden` where native gives `visible`, so a control that grows is fine on a phone and quietly loses a corner on web. Not global: glass clips its blur, a card clips its artwork.
- **`raiseWhilePressed`** on anything that can grow past a sibling — siblings paint in source order.

A scroll view clips at its own edge and no overflow rule reaches it, so a list whose items grow carries the gutter in `contentContainerStyle` and takes `Screen gutter={false}`. `Checkbox` and text links are deliberately excluded from press growth.

## Auth

`AuthProvider` (`src/lib/auth-store.tsx`) decides before anything fetches: the gate in `src/app/_layout.tsx` holds the splash until the session resolves, and `CardsProvider` / `CollectionsProvider` sit outside that gate, so both must wait for `signed-in` before their first request. Without the wait the request goes out unauthenticated, and its 401 does not even end the session — `client.ts` treats only a 401 *sent with a token* as expiry — so the screen freezes on `HTTP 401` while still signed in.

**Apple is a stub, and is not optional once any social provider ships** (App Store 4.8). Google is wired to `signInWithProvider`; provider button colours come from `brand-marks/palettes.ts` through `Button`'s `palette` prop. 이메일 찾기 and 비밀번호 재설정 are design only — no endpoint exists.

## The card

The face carries **two lines of type along the top and nothing else** — the city in caps with the purchase date under it on the left, the house's mark on the right. The product's name is not on the face; it goes in the caption under it.

- **A face is either one image or three layers, never both.** `cardArtSource()` resolves the backend URL first and the bundled mock only when there is none; `cardFaceLayers()` answers first and wins, because a layered card has no single image to resolve. `CardFace` picks between them and everything above the artwork — scrim, city, date, mark — is identical in both. **The anatomy belongs to the platform**; a house's approved artwork fills the face, it does not redraw it.
- **Artwork is generated.** Prompt: `dev/active/card-art-prompt.md`.
- **A brand's mark travels as data** — `Brand.logoUrl` via `brandMarkSource()`, knocked out to white. Never drawn by hand. A brand without a mark signs with its name set in type; that is a supported state, not a gap. It is still a bundled file only because no DTO exposes `brands.logo_url`.
- The top-band scrim is an SVG gradient (`react-native-svg`), not stacked translucent bands, which would visibly band against a sky.
- **`type.engraving` is the city and nothing else** — Cormorant Garamond SemiBold, the second and last exception to the platform font.
- `colors.glassFill` / `glassEdge` / `glassShadow` / `scrimInk` are the only token entries that are not a step on the gray scale.
- **Dates are formatted fixed** (`2026.07.14`), never `toLocaleDateString` — locale output changes width between devices and breaks grid alignment.
- **There are two ways to customise a card, and only one of them waits.** AI generation is 202 then polling with no push channel, and the waiting state is part of that design rather than a gap in it (`/card/[id]/edit`). The approved-asset path picks brand-approved PNGs and answers 201 once — no polling, no `select` round trip, and no dependence on `AI_ENABLED` (`/card/[id]/design`). One entry, `/card/[id]/design`, forks between them; the card detail never offers two actions.
- **The approved-asset face is composed on the client** (`CardLayerStack`), because the server bakes nothing — the card stores an arrangement, not a picture. Three layers, fixed order: background, border, then the one line the customer placed. Only that line moves; the server hardens the other two at `{0,0,1,1}`.
- **The customer's line is the one raw `fontSize` in the app** — `faceTextStyle()` sets it from the layer box's height, so the same card reads at the same proportion in a grid tile and in the hero. The size is data the card carries, not a decision the type scale can make; the face, weight and tracking still come from a token (`faceInk`). Same argument as `brand.accent`. Editor and card call that one function, so a preview cannot drift from the result.

## Deployment

**A push to `main` ships it** — `.github/workflows/deploy.yml` runs `vercel deploy --prod` for the project `curio`, live at `https://curio-xi-lovat.vercel.app`. Why it is built the way it is, is commented in the workflow itself. `npx vercel --prod` from the repo root is the way to ship without pushing.

- **`main` is production, and shipping is asynchronous.** What is pushed there is live within two minutes whoever pushed it, and a deploy that fails does so in Actions rather than in the terminal that pushed — `gh run list` is where it is seen, not the push output.
- **`vercel link` is refused, and that is expected.** The Vercel GitHub App installs on an *account*, never on a repo, and this one belongs to someone else's — which is why the workflow carries a `VERCEL_TOKEN` of ours instead. Three repo secrets hold it: `VERCEL_TOKEN` · `VERCEL_ORG_ID` · `VERCEL_PROJECT_ID`, the last two being what `.vercel/project.json` keeps locally and gitignores.
- **Write access is enough to set repo secrets here**, though the Settings UI that would show them is admin-only — `gh secret set` is the way in.
- **`web.output` is `single`, not `static`.** Static rendering spells a dynamic segment `dist/card/[id].html`, which static hosting cannot resolve; the deep link then falls through the catch-all onto the wrong screen's markup.
- **`api/proxy.mjs` is the web's only route to the backend** — `/api/`, `/images/`, `/generated/`, the same three prefixes `metro.config.js` proxies in dev, each rewritten to it with `?upstream=`. So `src/lib/config.ts` proxies on web unconditionally, with no `__DEV__` in the condition.
- **A rewrite cannot dodge CORS, because it does not strip `Origin`.** A browser attaches `Origin` to a POST even when it is same-origin, and the backend's allow-list has no deploy origin, so login answers `403 Invalid CORS request` while GETs pass. The proxy is a **function** for that one reason: a function can drop the header. Delete it the day the backend adds the origin (`backend-open-items.md` §5).
- **Vercel reads `.vercelignore`, not `.gitignore`.** `ios/` is gitignored but still uploaded, and that one directory is past the 15,000-file limit on its own — the deploy is refused with `missing_archive`.
- **A `functions` key is a glob, so a filename with brackets never matches itself.** `api/[...path].mjs` reads as a character class, the function is dropped, and **the deploy still succeeds** — every `/api/**` falls through to the SPA, so GET answers 200 with HTML and POST answers 405. Keep function filenames plain.
- **The backend address is written once**, as `EXPO_PUBLIC_API_URL`, read by the app and by `api/proxy.mjs` alike. Set it on the Vercel project as well as in `.env`; absent, it falls back to `http://localhost:8080`, which no deployed browser can reach.
- **`vercel link` adds `.env*` to `.gitignore` — delete that line.** It swallows `.env`, which holds an address rather than a secret. Keep `.vercel` and the existing `.env*.local`.
- **Verify with `curl`, not a browser** — `/` and a deep link for the SPA fallback; a proxied path against the same path called on the backend directly (identical status = faithful proxy).

## Backend and data

I own the **frontend**. The backend is live at `http://1.201.117.14` (`/api/v1`) and the app is wired to it. Three documents divide the ground and **none of them overlaps another**, because the one that used to mix them went stale without anyone noticing and the app broke against a server it no longer described:

- `dev/active/backend-contract.md` — what the API *is*. Every endpoint, request, response field in declaration order, and error code. **Anything the API states belongs there and not here.** Re-sweep the backend and replace it wholesale rather than patching it.
- `dev/active/backend-open-items.md` — what is blocked and what to ask the backend for. This is the only file that carries intent, and a resolved line gets deleted, not marked resolved.
- `dev/active/db-schema-draft.md` — the database read off the Flyway migrations. **A column existing there does not mean the API returns it**; the contract wins on that question.

- **The backend moves without telling us**, and a silent frontend failure is how we find out — a response shape changed from a list to a group, the code kept calling `.map`, a catch swallowed it, and a screen simply stopped working with no error. Check the migration list and `/v3/api-docs` before trusting any of these documents.
- **Never `assertNever` over a value the network supplies.** Exhaustiveness is a compile-time tool and the network is not compile time; the day the backend adds a seventh status, a switch that ends in a throw takes the screen down with it.
- **There is no mock data and no switch.** Everything a screen shows came from the backend, so an empty screen means the server has nothing and an error screen means it did not answer — neither is ever a stand-in. **A domain with no controller gets no screen**: care services and brand events were built on mocks and were removed with them, rather than kept as pages that lie. When an endpoint lands, the screen comes back with it.
- **The one exception is bundled artwork** (`src/lib/mock/card-art.ts`, `brand-marks.ts`), which is a fallback asset rather than data: `cardArtSource()` and `brandMarkSource()` take the backend's URL whenever there is one and fall back to the bundle only when a card has no art yet. A card face is never blank; nothing else in the app substitutes.
- **Two things named AI, and only one of them is.** Card design generation is a real model and the screen says so. Collection suggestions (`src/lib/suggestions.ts`) and recommended cards (`src/lib/recommendations.ts`) are rules over cards already in hand — **they never use the word.** Calling a rule AI spends the credibility the real one needs. Say the reason instead; derived from the customer's own cards, the reason is true.

**Rules only, written as they land.** If a line explains why an existing screen looks the way it does rather than constraining the next one, it belongs in `dev/active/`. If the API states it, it belongs in the contract.
