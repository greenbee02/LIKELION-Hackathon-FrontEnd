## Working Principles (Karpathy)

- State assumptions explicitly. If multiple interpretations exist, surface them — don't pick silently. If something is unclear, stop and ask.
- Push back when warranted. If the user's ask has a flaw or a simpler path exists, say so — don't just comply.
- Convert imperative tasks ("add X", "fix Y") into verifiable goals (test that fails → make it pass; tests green before AND after refactor).
- For multi-step work, decompose as `1. step → verify: check` and execute step by step.

## Product

**The product is called Curio** (decided 2026-08-19). Use it as the app's name everywhere the platform speaks for itself — splash, auth screens, profile, share sheet, empty states — and nowhere a brand speaks for itself: a card, its detail view, and its rewards carry the house's name, never ours. The name is set in `app.json` (`name`/`slug`/`scheme`) and `package.json`. No wordmark or logo has been designed yet; until one exists, Curio is set in the platform's own type roles like any other text.

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
- **Type comes from `src/theme/typography.ts` — the platform's own font**, set in roles (`display` `title` `heading` `body` `action` `label` `caption`), never a raw `fontSize`. `action` (16/600) is a control's own name — a button, or a link standing in for one; `label` (14/500) is what annotates something else, like a form field or a tab. Size, line height, and weight were chosen together; splitting them at a call site is how a type system stops being one. The system font is the neutral choice: a brand's typeface, if one ever arrives, travels with that brand's cards as data and never sets the interface.
- **Spacing comes from `src/theme/spacing.ts` — a 4pt scale** (`space[1]`…`space[7]` = 4·8·12·16·24·32·48). Screen gutters are 16, a card's inner padding 12, unrelated sections 32 apart.
- **Corner radius comes from `src/theme/radius.ts`.** `radius.base` (12) is the default for buttons, inputs, cards, panels, and list rows; `radius.full` is for pills and circles — search fields, icon-only buttons, tags; `radius.small` (4) is for elements under roughly 28pt, where 12 stops being a softened corner and becomes a circle — checkboxes, badges. Those three are the whole scale: if something seems to need a fourth, say so rather than writing a number at the call site.
- **Every word on screen is Korean (decided 2026-08-19).** The audience that decides this project's outcome is the Korean room it gets demoed to, and a judge reading English copy is doing translation work instead of watching the product. This covers labels, buttons, placeholders, validation and error messages, empty states, toasts, tab titles, and accessibility labels — including the provider names on the social buttons (`구글로 로그인`, `애플로 로그인`).
  Note the tension, because it is real and unresolved: the brief's customer is an **overseas** traveller shopping in Korea (§2), so the shipped product's language is English and this is a demo-time choice, not a product one. Nothing is centralised for translation yet — copy is written inline at each call site — so flipping the app's language means editing every screen. If both languages are ever needed at once, that is the moment to pull strings into one module, not before.
  The one exception is the wordmark: `Curio` stays in Latin because it is a name, not a word.
- **No dark mode.** Light only — `grayDark` is deliberately not imported.
- **Every screen that loads data has three states: skeleton → loaded, or empty.** Design all three; never ship a spinner or a blank screen where a skeleton belongs. Radix Themes' Skeleton is DOM-only and does not run here, so we build our own to match its behaviour: a gray-3 fill in the shape of the content it stands in for, pulsing.
- Behaviour comes from `@rn-primitives/*`, appearance from us. A primitive supplies the open/close, focus, and dismiss logic; it never dictates how something looks.
- Surfaces that float over content use **iOS-style glass**: a blur under a translucent fill, edged by a hairline. Glass is crisp and near-white, not a heavy frost — content under it must stay readable. `expo-blur` works everywhere; `expo-glass-effect` gives the real thing on iOS 26+ and must degrade to `expo-blur` elsewhere.

### Components (settled 2026-08-19, with the auth screens)

Every screen is built from `src/components/ui/`. If a screen needs something not there, it goes there first.

- **`Screen`** — safe area, app background, the 16pt gutter. `gutter={false}` is the only escape, and it stays a boolean: a screen with its own gutter number has drifted off the scale.
- **`Text`** — the only way a word reaches the screen. Props are `variant` (a type role) and `tone` (`default` 12 / `muted` 11 / `inverted` 1). No size prop, and no fourth tone — there is no way to spell "lighter than muted" and that is the point.
- **`Button`** — two weights only, `solid` and `outline`. A screen with two equally loud buttons has not decided what it is for. A press moves the fill one step **and grows the control** — see Motion below.
- **`Input`** — labelled field, error message under it. `required` appends the asterisk that marks a field the form will not submit without.
- **`Checkbox`** — a row: a control on the left, a label that fills the rest. `mark="box"` is a control the customer operates; `mark="mark"` is a bare tick reporting one line of a group the box above governs. Built here rather than pulled from `@rn-primitives/*`, which is the right call only where there is no open/close, focus trap or dismiss to supply. It is the reason `radius.small` exists.
- **`Toast`** — one line, bottom, two seconds, no queue. For controls that are visibly present but not yet wired.
- **Controls are 52pt tall.** `radius.base` was measured against that height, so buttons and inputs share it and a form reads as one stack.
- **Error states carry no colour, because the palette has none.** A gray-only system cannot spell "red border", so an invalid field says so three ways at once: border steps to 8, an icon appears, and the message sits at step 12 rather than the muted 11. This is the convention for every error surface, not a local workaround.
- **`IconButton`** — the only icon-only control, 40pt, `radius.full`. `variant="glass"` puts it on a glass disc; that is what the collection's scan button and every back arrow wear. An icon has no corners of its own to echo, so a rounded square around one is a shape the content never asked for.
- **`GlassSurface`** — the one implementation of glass. `expo-glass-effect` on iOS 26+, `expo-blur` under a 70% white veil everywhere else, a translucent hairline, and a shadow. The shadow is half the material *for a surface that floats*: over a white page the blur has nothing to blur and the veil matches the ground, so without it the surface disappears. `shadow={false}` is for the one case that does not float — a surface fused to the screen's edges has no gap to cast into, and `corners="top"` rounds only the two edges it does not share with a wall. Anything that floats — tab bar, menus, icon buttons — is this component.
- **`Dialog`** — a question the app has to ask before doing something it cannot undo, built on `@rn-primitives/dialog` and worn as glass. Controlled, not triggered: a confirmation is opened by an action the caller already owns a button for. **It is the only floating surface with a scrim** — a menu can be dismissed by ignoring it, so the page under it stays live, but a question the customer can reach past is not a question. The scrim is a layer of its own at 50%, never opacity on the overlay, which would dim the panel with it. **The safe answer is the loud one**: `solid` marks what a screen wants you to do, and on a screen asking whether to delete an account that is not deleting the account — the palette has no red to spend, so weight is the only thing left to say it with. Buttons stack rather than sit side by side; two 52pt controls in a row on a narrow phone leave each about 130pt, which forces a destructive verb to shrink into something vaguer than what it does.
- **`ProgressBar`** — how far along something is, drawn rather than only counted. The number beside it says the same thing more precisely, so this carries *distance*, not information: the gap between where the bar stops and where it ends is the reason there is another card to buy. Gray 9 fill on a gray 3 track — a fill is steps 9–10 and a track is a control at rest; neither is text, so neither may go above step 8. 6pt tall on `radius.full`, because at that height a corner is not softened, it is round.
- **`Dropdown`** — single choice, built on `@rn-primitives/dropdown-menu`, worn as glass. Options may carry a `group`, printed once as a heading above the first option holding it. A heading rather than a rule between groups: a line says "these are separate", a word says what separates them.
- **`EmptyState`** — icon at step 8, a title, a note, and at most one action. A finished state, not an apology.
- **Card components** (`src/components/card/`) — `CardFace` is the object itself and is reused at every size; `CardTile` is the face plus the two things it cannot say; `CardTileSkeleton` takes its aspect ratio and line heights from the other two rather than repeating them.
- **The tab bar is ours** (`src/components/navigation/tab-bar.tsx`), not `tabBarStyle` — a floating glass bar that content scrolls underneath, which `tabBarStyle` cannot express. Its height is derived, not picked: icon 22 + gap 4 + caption 16 = 42, the selected fill clears that by 4 a side, the bar clears the fill by 8. Every scrolling tab screen ends its content with `useTabBarSpace()`.
- **`src/components/brand-marks/` is the only place a hex value may live**, marks and the button palettes beside them. Google's four colours and Apple's silhouette are those companies' property and re-tinting them to a gray step would be wrong. The rule holds with its reason intact: colour that belongs to someone else lives as data. A card brand's accent travels the same way, in `Brand.accent`.

### Motion (settled 2026-08-19)

**Every motion is defined once in `src/theme/motion.ts`.** Durations picked per component are how an interface ends up feeling like several interfaces.

There are three, and each is a different kind of event:

- **Press**, applied through `usePressScale()` — a control grows 16% while held, 90ms in, 160ms out, decelerating both ways. It answers a finger already moving, so it has to feel simultaneous with the touch.
- **Flip**, which only the card has (`CardFlip`) — 420ms, easing in *and* out, over a 900 perspective. The object turns after the finger has let go, starting and ending at rest, which is why it is the one motion with its own curve.
- **Sheet**, settling after a drag (`Sheet`) — 260ms on the press curve. It is already moving when the finger leaves, so it decelerates out of a motion in progress rather than starting from rest; only the duration is its own.

This reverses the earlier rule that a press never moves the size. The reason it was written — that the card should be the thing that moves — turned out to be an argument for the card moving *more*, not for everything else holding still.

Two consequences a call site has to honour, both exported beside the hook:

- **`allowPressOverflow`** on every container the growth passes through. React Native Web gives `View` `overflow: hidden` by default where native gives `visible`, so a control that grows is fine on a phone and quietly loses a corner on the web export. Not applied globally: glass clips its blur and a card clips its artwork, and both need to keep doing that.
- **`raiseWhilePressed`** on anything that can grow past a sibling. Siblings paint in source order, so without it a pressed card slides *under* the unpressed one beside it.

A scroll view clips at its own edge and no overflow rule reaches it, so a list whose items grow carries the screen gutter in its `contentContainerStyle` and takes `Screen gutter={false}`. The collection grid is the worked example.

`Checkbox` and text links are deliberately excluded: the tick is its own answer, and a link that grows collides with the words beside it.

### Auth shell

`AuthProvider` (`src/lib/auth-store.tsx`) holds `restoring | signed-out | signed-in`; the session gate in `src/app/_layout.tsx` redirects on it and keeps the splash up until it resolves. A returning customer never sees the sign-in form, a new one never sees a tab bar, and neither flashes the wrong screen. `USE_MOCK` and `SKIP_AUTH` in that file are the two dev switches.

The door is **social-first, email one tap behind it**, laid out the way Korean commerce apps have trained their customers — wordmark alone in the upper third, social buttons stacked in the middle, email routes as a pair of plain links under them. No tagline and no illustration: the only question the screen asks is which account you already have. It has no back arrow either, being where the app starts.

```
/sign-in            wordmark · 구글로 로그인 · 애플로 로그인 · [이메일 가입 | 이메일 로그인]
  └ /sign-in/email  이메일 + 비밀번호 · [이메일 찾기 | 비밀번호 재설정]
      └ /sign-up    이메일 · 비밀번호 · 필수 약관 3건
```

The email links carry equal weight and sit either side of a hairline rule — neither is the other's fallback, so neither is styled as a button; a third control of button weight would flatten the screen into a menu. The rule between them is step 6, not the step-7 border of a real edge: it separates without drawing a line the eye has to read. The sign-in screen's foot carries account recovery — 이메일 찾기 and 비밀번호 재설정, equally weighted, because someone who cannot get in does not yet know which half of the credential they lost. Signing up is not repeated there: that branch is on the door, and mixing "make an account" into a row about recovering one asks the customer to sort out which situation applies while they are already stuck. Both recovery links are design only; the backend has no endpoint for either.

Password reset is design only — the backend has no endpoint for it — and says so when tapped, the same as the social buttons.

Sign-up asks for **two fields and three consents, and nothing else**: no referral code, no optional marketing tier, no display name (the nickname the backend wants is seeded from the address). An account exists to hold cards, and every field not needed to issue the first one is a reason to abandon the form. The consent documents are not written, so **no "내용 보기" link is offered** — a link that opens nothing is worse than its absence. The submit button stays disabled until all three are ticked, and it is the screen's last element — no "이미 계정이 있으신가요?" line, since the back arrow and the door behind it are both one tap away and a form's last word should be the thing it wants you to do.

Social sign-in is **Google and Apple**. Google is wired to `signInWithProvider`, which mints a mock session while `USE_MOCK` holds so the demo walks the product from the door rather than from a bypass flag; when the real round trip lands — open `/oauth2/authorization/{provider}`, catch the redirect on the `curio://` scheme, trade the one-shot code through `POST /auth/oauth/exchange` — only that function changes. Apple is still a stub and raises a toast. Each wears the button its provider specifies: Apple's is black (`#000000`) with a white mark and label, Google's is the white one, which is what `outline` already is. Those colours come from `brand-marks/palettes.ts` through `Button`'s `palette` prop — the one way colour reaches a control from outside the token file, and never for anything of ours. Apple is not optional once any social provider is offered (App Store guideline 4.8); the backend currently exposes google and kakao, so Apple is the one to request when these get wired. The providers appear on the first screen only: repeating them deeper in the email branch would imply they lead somewhere different.

**The wordmark is set in Titillium Web, and nothing else is.** It lives as the `wordmark` role in `src/theme/typography.ts` and appears on `/sign-in` alone. A wordmark is a logo rather than typography, and the face belongs to Curio — the platform — not to any house whose cards it carries, so the rule that a brand's typeface never sets the interface holds intact. It is set in Bold (700). Import the weight subpath (`@expo-google-fonts/titillium-web/700Bold`), never the package root, which pulls all 22 faces into the bundle.

### The card (settled 2026-08-19)

The face carries **two lines of type along the top and nothing else**: the city in caps with the purchase date under it on the left, the house's mark on the right. The product's name is *not* on it — the picture already shows what was bought, and printing the name over the artwork covers the product in order to describe it. The name and the store go under the card as a caption, because a wall of pictures with no words stops being a collection and becomes a gallery.

- **Artwork is generated**, one image per card, the product standing in the city it was bought in with that city's landmark behind it. The prompt is `dev/active/card-art-prompt.md`. `cardArtSource()` resolves the backend's URL first and the bundled mock only when there is none, so a card moves from mock to live without the face being rewritten.
- **A brand's mark travels as data**, `Brand.logoUrl`, resolved by `brandMarkSource()` and knocked out to white on the face. Never drawn by hand: a hand-traced monogram is a wrong logo, and a wrong logo is worse than none. A brand without a mark signs with its name set in type — a supported state, not a gap.
- **The scrim is a gradient across the top band only**, drawn in SVG (`react-native-svg`, already a dependency — stacked translucent bands would visibly band against a sky). Artwork is generated, so that band could be a night sky or a sunlit wall; a flat wash would have to be dark enough for the worst case and would mute every image to protect two lines.
- **`type.engraving` is the city, and nothing else** — Cormorant Garamond SemiBold, the second and last exception to the platform font. Narrower grounds than the wordmark's: this is not interface type at all but a mark struck on an object, the way a year is struck on a coin. It sets no label, button or heading anywhere.
- `colors.glassFill` / `glassEdge` / `glassShadow` / `scrimInk` are the only entries in the token file that are not a step on the gray scale. Glass is not a colour but a blur, a veil and an edge; a scrim is ink whose darkness is the scrim's own business.

### 내 컬렉션 (settled 2026-08-19)

Two-column grid, cards only, captions under each. **The title is the filter**: `내 컬렉션` for everything, `한정판` or a city when narrowed, with a chevron opening a menu. No count beside it and no chip row under it — a chip row spends a whole band restating one line and gets worse with every filter added.

Which filters exist is computed from the cards (`src/lib/collection-filters.ts`), never declared: no 한정판 row unless some cards are limited and some are not, no city rows unless purchases span cities, no brand rows until a second house arrives. Every filter therefore returns at least one card, which is why this screen has one empty state rather than two.

Dates are fixed `2026.07.14`, not `toLocaleDateString` — locale output changes width between devices and breaks a grid's alignment, and the demo should look the same whatever phone is in the room.

### 카드 상세 (settled 2026-08-19)

`/card/[id]` — one card, and **two ways of asking it a question.** The card is not the illustration at the top of a page of information; it is the information. Nothing on this screen scrolls past the card to reach detail — the detail comes to the card.

- **Tap turns it over.** The back is about *this card*: the serial it was issued under, the day and shop it came from, how long it is covered.
- **Swipe up opens the sheet.** That is about the *product*: collection, category, material, origin, season, model number, what the warranty covers, care — lines that would read the same on anyone else's card of the same thing.

**The two reveals divide by whose fact it is**, and that is what makes two gestures on one screen learnable rather than arbitrary: a customer can guess which one holds what, and neither surface repeats a row from the other. Two pairs show the line clearly:

- **The two numbers.** `Card.serialNumber` names this one card and is stamped on the back; `product.code` names the model, every unit shares it, and it goes in the sheet. The brief lists both (§4), and printing them side by side would suggest they are two spellings of one thing.
- **The two halves of the warranty.** How long this card is covered is on the back (기간, 만료일); what "covered" means is in the sheet (보증 내용). The duration belongs to the purchase and the terms belong to the product. The only thing off both is the product's name, which is the screen's title and has to be readable while the front is showing and the sheet is closed.

The hero is the same `CardFace` the grid drew, not a larger variant of it — the customer tapped a specific object and has to land on that object rather than on a page about it. Held to 280: wider than the issuance screen's 220, since this is the one screen whose subject is a single card, and narrower than the gutter, since a 3:4 face at full width is a poster and a collectible is not.

**`CardBack`** (`src/components/card/card-back.tsx`) — card stock, not a panel. Gray 1 fill with a **step-7** edge, because a printed back is the whitest thing in the room and against a gray-1 page only a real border can say where the card ends; step 6 is the rule *inside* it, which separates without drawing a line the eye stops at. The serial sits in the corner the front keeps for the city, and the house's mark answers from the corner it signs the front from — knocked to step 12 rather than white, since it is the same signature on the opposite ground.

- It keeps the face's 3:4 **exactly**: a card that changed shape when turned over would stop being one object. Four lines do not fill that and are not meant to — head and foot carry the type, the middle is left as the card's own material. A guarantee printed edge to edge would be a receipt.
- **A row with no value is not rendered.** `warrantyMonths` is a column the DTO does not expose (scope §2), so this is the back's live-data behaviour and not a mock convenience. A dash would be the card admitting it asked a question it could not answer.
- **The warranty is shown as a date, not only a length.** `formatWarrantyExpiry()` turns `warrantyMonths` into 보증 만료일 in the same stamp every other date uses. "24개월" is arithmetic handed to someone holding a receipt.

**`CardFlip`** (`src/components/card/card-flip.tsx`) — both sides live in one box, one in flow and one laid over it, and the box rotates about its vertical axis. Nothing mounts or unmounts on the way: a flip that swapped components at the halfway point would be a cut dressed as a rotation. `backfaceVisibility` is the mechanism and an opacity switch at the midpoint is the belt to its braces — it changes while the card is edge-on and zero pixels wide, so it has nothing to show. **A card gives no sign that it turns**, so one `caption` line under it says so — 탭해서 뒤집기 / 탭해서 앞면 보기. The demo is watched by people who will not try.

**`Sheet`** (`src/components/ui/sheet.tsx`) — the third answer for detail that belongs to a screen but is not what the screen is about. Below the fold is found by scrolling past the subject; a modal replaces the subject to show something subordinate to it. A sheet leaves the subject where it is and brings the detail to meet it.

- **It is fused to the screen's edges, and it is the one glass surface that is.** The tab bar is an object laid on top of a page and has to show the page passing on both sides of it to read that way; a sheet is not an object on the page but the bottom wall of the screen coming up. The gesture starts at that edge, so the thing it moves has to own it — a panel with air on three sides reads as a card that happens to be near the bottom, and the motion stops meaning anything. Only the two corners facing the content are rounded (`GlassSurface corners="top"`), because the two against the wall have no shape of their own.
- **It casts no shadow, and it is the only glass surface that does not** (`GlassSurface shadow={false}`). A shadow is what a surface drops into the gap between itself and the page, and a sheet fused to three walls has no gap. What separates it from the content is its single real top edge, which the glass hairline already draws — a shadow there is not depth, it is a thick dark line along the one edge the surface has.
- **The home indicator's clearance migrates as the panel opens.** Closed, the title is the last thing above the edge and the head carries the inset; open, the content is, and the body's bottom padding does. A fixed inset on the head opens a gap under the title, and an inset only on the body is clipped away with the body while it is closed — the clip cuts from the bottom, so whatever sits last in the layout is cut first.
- **The height is animated, not the position.** The panel is anchored to the bottom, so growing downward in layout moves its header *up* the screen — the motion being asked for — and it needs no clipping container to hide the overflow, because the glass already clips.
- **Nothing mounts when it opens.** The content is laid out from the first frame and measured once; opening only changes how much of it the clip lets through. That is what makes the height animation possible at all, and it means the sheet cannot pop, reflow, or arrive late.
- The drag is a fraction of the content's own height, so the panel arrives under the finger. A flick decides on its own whatever distance it covered; a slow drag is decided by where it was let go. `SHEET_PEEK` is derived (8 + 4 + 8 + 22 + 12 = 54, safe area not included) and `useSheetSpace()` is what a screen ends its content with, exactly as `useTabBarSpace()` is.
- **A gesture that opens onto nothing is worse than no gesture.** Every field the sheet carries is one the DTO does not expose, so the screen asks `hasProductDetail()` first and leaves the sheet off entirely when there is nothing in it.

**The collection a product belongs to** (`Product.collection`) is the sheet's first line, and it is there for more than a label: it is the unit rewards are counted on (`collection_rewards.required_percentage` in the schema draft), so it is the thread that will eventually run from this screen to the reward that finishing a set unlocks. Kept to `{ id, name }` — the backend's `product_collections` carries a cover, a theme, a year and a limited flag, none of it exposed, and guessing the shape of something unbuilt is how a type ends up describing nothing. Progress (`2 of 4`) is the customer's fact, not the product's, so it belongs to the rewards screen and not here.

**`Badge`** (`src/components/ui/badge.tsx`) — one word about the thing beside it, 한정판 today. Not a control: no press, no action. A filled `surface` ground rather than an outline, because the palette has no colour to mark something special with and an outlined gray badge beside gray text is a rectangle nobody reads. Its text stays at step 12 — a claim about the product, not metadata about it. 24pt tall, which is the case `radius.small` was written for.

**Sharing is the screen's one action**, and it is a named button under the card — the screen's last element, because a screen's final word should be the thing it wants you to do. `outline` rather than `solid`: the subject here is the card, and a filled control directly under it would be the darkest thing on the page and pull the eye off the object it is about. What is still absent is customisation, blocked on `GET /card-templates` (scope §4-C), and §9's repair and care links, which have no column in the schema to hold them. A control that raises a toast explaining why it does nothing is a control this screen cannot honour.

**Mock product detail is written in Korean** (`material` `origin` `category` `careInfo`), since this screen is the first to render those fields and the room reading them is Korean. Product names, store names and cities stay as they are — those are proper nouns, and the city is engraved on the face in Latin caps.

### 리워드 (settled 2026-08-19)

`/(tabs)/rewards` — what the collection is for. The collection screen answers "what do I have"; this one answers "what is it worth", and they are the same loop seen from either end.

- **Locked rewards are shown, and that is the point of the screen.** A reward already in hand is a receipt; a reward two cards away is the reason there is a third card to buy. Every entry names the official collection it is counted on, so a customer who wants one knows which card to go and buy — that thread is the product's whole return path, and a list of only what is already unlocked would cut it.
- **Rewards belong to a house, never to Curio.** When they span more than one brand the list is grouped under brand headings; with a single house there is nothing to divide, so the heading is dropped rather than printed once over everything. Derived, not declared — the same rule `collectionFilters` follows, and for the same reason.
- **The control's name comes from `kind`.** An invitation has nothing to hand over, a benefit is used rather than collected, and goods are picked up in a shop — 초대 확인하기 / 혜택 사용하기 / 매장에서 받기. One label covering all three would have to go vague, and vague is the one thing a reason-to-return cannot be.
- **Only an open reward has a control.** Locked, claimed and expired ones are statements, and their last line says the one thing that can be acted on — 앞으로 2장, or the date and shop a benefit was used at.
- A reward is a panel (gray 2, `radius.base`), unlike a card, which is never given one. The card is its own subject and chrome around it would compete; a reward has no picture, so what would separate one from the next is nothing but a gap.
- **The panel is not pressable.** Every pressable here grows 16% under the finger, which is right for a tile and wrong for a full-width panel — it would swell past both gutters and be clipped by the scroll view on the web export.
- **`LOCKED` is the frontend's own state** with no row behind it: the backend writes `user_rewards` only once a reward unlocks. The other three are `user_rewards.status`.
- Mock progress **agrees with `MOCK_CARDS`**, and Seoul Exclusive carries two rewards at different thresholds on purpose — `collection_rewards.required_percentage` is per reward, not per collection, so one set can open a small benefit early and hold its real prize for the last card. That mechanic is the loop, and one reward per collection would hide it.

`/reward/[id]` — one code, held up to a shop assistant. §10 wants the reward itself to be a reason to walk back into a store, and a benefit redeemed by tapping a button in an app would not be, so the whole screen is the code and the sentence telling you what to do with it. The code is the largest thing on it but **not `display`**, which is reserved for the issuance moment and appears once in the whole app. It is the one place a call site touches `letterSpacing`: this is not type set to be read as words but characters to be told apart one at a time across a counter. A spent code stays visible at step 11 — still legible, no longer the instruction.

### 공유 (settled 2026-08-19)

`/share/[id]`, reached from the 공유하기 button under the card on its detail screen.

**Only the front goes, and that is the feature rather than a simplification.** The back carries the serial the card was issued under and the shop it came from — a purchase record that belongs to nobody but its owner. The screen says so in a line rather than assuming anyone works it out.

**What is captured is the node that was on screen**, framed and all (`react-native-view-shot`), so the exported image cannot drift from what the customer approved. It is the only feature in the product that needs no endpoint at all. Web has no share sheet to hand a file to, so the button reports that — a platform limit, said out loud, which is a different thing from a control that does nothing.

### 마이 (settled 2026-08-19)

Sign-out comes before anything else, because without it the session survives a reload, the gate sends a signed-in customer past `/sign-in`, and the door becomes unreachable from inside the product — a hole in the demo as much as in the app.

**Withdrawal is a real endpoint and destructive, so it asks first**, and the dialog is the whole feature: `DELETE /auth/me` is one line, and what took a component is that an account holding a collection must not be deletable by a mis-tap on the way to signing out. It is a text link under the sign-out button, worn exactly as the sign-in screen's are — padded, `radius.base`, a step-3 fill under the finger, no underline — and not a third button: a foot with two controls of equal weight has not said which one you probably meant. Whether the server accepts the deletion or the network drops it, the local session ends: an account deleted server-side but still signed in on the device is the one outcome worse than either.

## Current Scope

- I own the **frontend**. The backend is live at `http://1.201.117.14` (`/api/v1`), and **the app is wired to it** as of 2026-08-20 — `dev/active/backend-integration-plan.md` is the authority on what a screen can actually have: it records every endpoint, every place the real response differs from what the frontend assumed, and what is still blocked. It was written against the running server, not against a spec. `dev/active/db-schema-draft.md` is the database read off the Flyway migrations (PostgreSQL, V1–V7); a column existing there still does not mean the API returns it.
- **Mock and live are one switch: `EXPO_PUBLIC_USE_MOCK` in `.env`.** It used to be three `USE_MOCK` constants in three files, which is how one gets left behind and the app runs half live. `src/lib/config.ts` is the only place that reads it.
- **A card is completed by its product.** `CardResponse.product` carries six fields and no brand, so `hydrateCard()` fetches `GET /products/{id}` — which is public, cached per product, and holds the house, the material, the warranty and the model number. The brand's colour and mark are still nobody's to give: `brands.logo_url` exists in the schema but no DTO exposes it, so `Brand.accent` stays a token and a card signs with its name set in type. That is the supported state, not a gap.
- **Against the live seed, the card back shows fewer rows than the mock does.** `productCode`, `origin`, `warrantyInfo` and `warrantyMonths` are all null in the seed, so 보증 기간·만료일 and 제품 번호 simply do not render. That is the rule working — a row with no value is not drawn, and the reason no dash is printed is exactly this case.
- **Card customization is AI-generated, not preset.** The backend generates backgrounds, borders, patterns, and product angles through OpenAI Images; the frontend polls `GET /cards/{id}/ai-resources` because generation is async (202 + `PENDING`) and there is no push channel. The waiting state is part of the design, not an afterthought.
- Current stage is **design/UI first**, and design is **mobile-first** — native phone screens are primary; web is the same app widened.
- **The design system is being built as we go.** Palette, radius, type, and spacing are settled (above); component conventions are not. Write decisions here as they land.
- Update this file as decisions land.
