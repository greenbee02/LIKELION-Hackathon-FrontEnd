## Working Principles (Karpathy)

- State assumptions explicitly. If multiple interpretations exist, surface them — don't pick silently. If something is unclear, stop and ask.
- Push back when warranted. If the user's ask has a flaw or a simpler path exists, say so — don't just comply.
- Convert imperative tasks ("add X", "fix Y") into verifiable goals (test that fails → make it pass; tests green before AND after refactor).
- For multi-step work, decompose as `1. step → verify: check` and execute step by step.

## Product

A service that turns luxury purchases into collectible **cards**. After a purchase, scanning the receipt QR issues a digital card. There is no physical card — that half of the original concept is scoped out. The card is the single medium linking purchase record, product info, authenticity, warranty/care, SNS sharing, and rewards. Full brief: `dev/active/product-brief.md`.

**This is a multi-brand platform, not any one brand's app.** MCM is the demo brand, one of several. Nothing in the app's chrome, palette, copy, or type system may belong to a specific brand — a brand's name, colours, and monogram travel with its cards as data. Onboarding a brand is a data change, never a design-system change. The backend agrees: every catalogue table is scoped by `brand_id`.

## Stack

Expo SDK 57 + Expo Router + React Native 0.86 + React Native Web + TypeScript. One codebase runs in Expo Go, native development builds, and the web export. Routes live in `src/app/`, `@/*` resolves to `src/*`.

- Animation: React Native Reanimated.
- Gestures: React Native Gesture Handler or the core responder system where simpler.
- Persistence: AsyncStorage behind a swappable store layer.
- Icons: lucide-react-native only. Never use `@expo/vector-icons`.
- Headless primitives: `@rn-primitives/*` — Radix's API ported to React Native. Radix UI proper is DOM-only and does not run here, so never install `@radix-ui/react-*`. Interactive behaviour (menus, dialogs, selects) comes from a primitive; styling stays ours.
- Web output is secondary to the phone demo, but every screen must remain usable on React Native Web.

## Design

Only what is listed here is settled.

**Colour comes from `src/theme/colors.ts` — Radix Colors' 12-step gray. Never write a hex value in a component, and never reach for a raw step when a role exists.** The step number carries the meaning: 1–2 backgrounds, 3–5 interactive fills, 6–8 borders, 9–10 solid fills, 11–12 text. If a role is missing, add it to the token file rather than importing `scale` twice.

- **Text is step 11 or 12, never lighter.** 12 (`text`) is primary; 11 (`textMuted`) is secondary and still clears WCAG AA (5.77:1 on the app background). Steps 9–10 are fills, not text.
- **Type comes from `src/theme/typography.ts` — the platform's own font**, set in roles (`display` `title` `heading` `body` `label` `caption`), never a raw `fontSize`. Size, line height, and weight were chosen together; splitting them at a call site is how a type system stops being one. The system font is the neutral choice: a brand's typeface, if one ever arrives, travels with that brand's cards as data and never sets the interface.
- **Spacing comes from `src/theme/spacing.ts` — a 4pt scale** (`space[1]`…`space[7]` = 4·8·12·16·24·32·48). Screen gutters are 16, a card's inner padding 12, unrelated sections 32 apart.
- **Corner radius comes from `src/theme/radius.ts`.** `radius.base` (12) is the default for buttons, inputs, cards, panels, and list rows; `radius.full` is for pills and circles — search fields, icon-only buttons, tags. There is no scale between the two: if something seems to need one, say so rather than writing a number at the call site.
- **No dark mode.** Light only — `grayDark` is deliberately not imported.
- **Every screen that loads data has three states: skeleton → loaded, or empty.** Design all three; never ship a spinner or a blank screen where a skeleton belongs. Radix Themes' Skeleton is DOM-only and does not run here, so we build our own to match its behaviour: a gray-3 fill in the shape of the content it stands in for, pulsing.
- Behaviour comes from `@rn-primitives/*`, appearance from us. A primitive supplies the open/close, focus, and dismiss logic; it never dictates how something looks.
- Surfaces that float over content use **iOS-style glass**: a blur under a translucent fill, edged by a hairline. Glass is crisp and near-white, not a heavy frost — content under it must stay readable. `expo-blur` works everywhere; `expo-glass-effect` gives the real thing on iOS 26+ and must degrade to `expo-blur` elsewhere.

## Current Scope

- I own the **frontend**. A backend exists and is partly implemented — `dev/active/scope-vs-backend.md` records exactly which endpoints are real, which fields are missing, and which screens are still mock. Keep the transport layer swappable so a screen can move from mock to live without being rewritten.
- **Card customization is AI-generated, not preset.** The backend generates backgrounds, borders, patterns, and product angles through OpenAI Images; the frontend polls `GET /cards/{id}/ai-resources` because generation is async (202 + `PENDING`) and there is no push channel. The waiting state is part of the design, not an afterthought.
- Current stage is **design/UI first**, and design is **mobile-first** — native phone screens are primary; web is the same app widened.
- **The design system is being built as we go.** Palette, radius, type, and spacing are settled (above); component conventions are not. Write decisions here as they land.
- Update this file as decisions land.
