# 미결 — 막힌 것과 백엔드에 요청할 것

기준: `9188d7d` (2026-08-20 21:14 KST) · 실서버 `http://1.201.117.14` 실측
갱신일: 2026-08-20

계약 자체는 `backend-contract.md`. 여기에는 **아직 해결되지 않았거나, 프론트 혼자서는 못 푸는
것**만 적는다. 해결되면 줄을 지운다 — 해결된 항목을 "해결됨"으로 남겨두면 다음 사람이 그것도
읽어야 한다.

---

## 1. 🔴 레이어 커스터마이징이 저장소에만 있고 실서버에 없다

`b5f9690` 이 `GET /cards/{id}/customization-options` 와
`POST /cards/{id}/customizations/layers` 를 더했는데, 실서버 `/v3/api-docs` 에 **둘 다 없다.**
배포된 빌드는 `c99def4`(06:18Z) 이상 `b5f9690`(06:42Z) 미만이다 — 그 사이에 들어온 이미지
이름 변경은 반영돼 있고(`common_back_black_info.png` 200, `…blank…` 404) 컨트롤러는 아니다.

같은 이유로 **V12 도 적용되지 않았다** — `GET /card-templates` 가 아직 템플릿마다 다른
`template_00X_back.png` 를 준다.

**요청:** `main` 최신(`9188d7d`)으로 재배포. 이것 하나가 아래 §2·§3 을 뺀 나머지 작업 전체의
전제다 — 배포 전에는 프론트가 붙을 대상이 없다.

## 2. 🟡 `CustomizationSummary` 에 레이어가 없다 — 목록에서 꾸민 얼굴을 못 그린다

레이어로 꾸민 카드는 `generatedFrontImageUrl` 이 **끝까지 `null`** 이다 (서버가 합성하지
않으므로 당연하다). 그런데 `GET /cards` 가 주는 `CardResponse.selectedCustomization` 은
`CustomizationSummary { id, status, generatedFrontImageUrl, generatedBackImageUrl,
generatedMessage, createdAt }` 그대로여서, **꾸몄다는 사실만 알 수 있고 무엇으로 꾸몄는지는
알 수 없다.**

`CardCustomizationResponse` 쪽에는 `frontLayers`·`back` 이 새로 붙었지만 그것은
`GET /cards/{id}/customizations` 의 응답이다. 즉 지금 설계대로면 홈 화면이 카드 N 장을
그리려고 **카드마다 요청을 한 번 더** 보내야 한다 — `hydrateCard()` 의 상품 조회에 이어
두 번째 N+1 이다.

**요청:** `CustomizationSummary` 에 `frontLayers` 와 `back` 을 추가.

**프론트는 우회하고 있다** — `cards.ts` 의 `withLayers()` 가 그 두 번째 요청을 보낸다. 이미지가
있는 커스텀과 커스텀이 없는 카드는 즉시 돌아 나가므로 늘어나는 왕복은 **꾸민 카드 수만큼**
이다. 이 항목이 해결되면 그 함수를 통째로 지운다.

## 3. 🟡 문구 레이어의 `style` 에 계약이 없다

요청의 `text.style` 은 `Map<String,Object>` 로 받아 검증 없이 저장하고 그대로 되돌려준다.
어떤 키가 유효한지 정해진 곳이 없고, 백엔드 예시가 `{ "fontFamily": "SERIF", "color":
"#E8DFD2" }` 를 쓸 뿐이다.

프론트가 렌더러이므로 사실상 **프론트가 정하면 그것이 계약이 된다.** 다만 나중에 서버가
이미지를 굽게 되면 같은 키를 서버도 해석해야 하므로, 합의해두지 않으면 그때 어긋난다.

**프론트는 정했다.** `src/app/card/[id]/design.tsx` 의 `FACE_TEXT_STYLE` 이 전부다:

```json
{ "fontFamily": "PLATFORM_SANS", "color": "INVERTED", "align": "LEFT" }
```

**세 값 다 hex 도 pt 도 아니고 뜻이다.** 서버가 굽게 되는 날 필요한 것은 우리 팔레트의 한
지점이지 어느 날의 색상값이 아니고, 카드마다 다른 색을 저장해두면 팔레트를 못 바꾼다.
`fontSize` 는 **아예 없다** — 글자 크기는 레이어 상자의 높이가 정하고, 그 값은 이미
`height` 로 전송된다. 크기를 두 곳에 적으면 언젠가 한 곳이 틀린다.

**요청:** 이 세 키를 그대로 받아들이거나, 다른 이름을 제안할 것. 값은 브랜드 승인 범위 안이어야
하므로 자유 문자열보다 열거형이 낫다.

---
## 4. 🟡 CORS 허용 목록에 Vercel 오리진이 없다

CORS 자체는 이제 있다 (`SecurityConfig.corsConfigurationSource`). 다만 허용 목록이
`CORS_ALLOWED_ORIGINS` 환경변수이고 실서버는 기본값 그대로다:

```
$ curl -i -X OPTIONS http://1.201.117.14/api/v1/card-templates \
    -H "Origin: https://curio-xi-lovat.vercel.app" -H "Access-Control-Request-Method: GET"
HTTP/1.1 403

$ ... -H "Origin: http://localhost:8081"
HTTP/1.1 200
Access-Control-Allow-Origin: http://localhost:8081
```

**요청:** `CORS_ALLOWED_ORIGINS` 에 `https://curio-xi-lovat.vercel.app` 추가.

**이 항목은 한때 "CORS 는 로컬 웹 개발을 위한 것"이라고 적혀 있었다. 틀렸다.** 리라이트는
요청 헤더를 그대로 넘기고, 브라우저는 same-origin 이어도 POST 에 `Origin` 을 붙인다. 그래서
배포 웹의 로그인이 `403 Invalid CORS request` 로 잘렸다 — `Origin` 이 붙지 않는 GET 은
통과했으므로 증상은 "카드는 보이는데 로그인만 안 됨"이었다 (2026-08-20 실측).

```
POST https://curio-xi-lovat.vercel.app/api/v1/auth/login   Origin 없음 → 200 · 있음 → 403
GET  https://curio-xi-lovat.vercel.app/images/…/prod_001.png  Origin 없음 → 200 · 있음 → 403
```

**프론트가 `api/proxy.mjs` 로 우회했다** — 헤더를 지울 수 있는 것은 리라이트가 아니라 함수뿐
이다. 그래서 🔴 이 아니라 🟡 다: 배포 웹은 지금 동작한다. 백엔드가 오리진을 넣으면 그 파일과
`vercel.json` 의 리라이트 세 줄을 지우고 원래의 단순한 리라이트로 돌아갈 수 있다.

## 5. 🟡 평문 HTTP — iOS ATS

`http://1.201.117.14`. iOS 개발 빌드는 ATS 예외가 필요하고, 앱 스토어 심사는 통과하지 못한다.
데모 범위에서는 감수하되, 도메인 + TLS 가 붙으면 `.env` 와 `vercel.json` **두 곳**을 고쳐야 한다.

## 6. 🔴 데모 QR 토큰이 소진됐다 — 새 계정은 카드를 한 장도 가질 수 없다

시드(`V7`)에 `MCM-DEMO-2026-001` ~ `-011` 열한 개가 `is_used = FALSE` 로 들어 있지만, 지금
DB 상태는 다르다 — 스캔하면 `QR_ALREADY_USED` 가 돌아온다. 토큰은 한 번 쓰면 소멸한다.

2026-08-20 실측, 열한 개 전부 `GET /purchase-qrs/preview` 가 `status: "USED"` ·
`usable: false`. QR 을 새로 만드는 엔드포인트는 `/v3/api-docs` 전체에 **없다** — 카드에
이르는 길은 `POST /cards/registrations` 하나뿐이고 그 입구가 닫혀 있다.

`POST /api/v1/local/demo/reset` 이 있지만 `@Profile({"local","test"})` 라 **실서버에 없다.**

**프론트는 이것을 가짜 카드로 가리고 있었고, 그 가림막을 걷어냈다.** `mock/demo-cards.ts` 가
세운 `c1`·`c2`·`c3` 은 서버에 없는 id 라서, 그 카드를 컬렉션에 담으면
`POST /collections/{id}/cards` 가 `400 Invalid UUID string: c1` 로 답했다. 낙관적 갱신이
먼저 그려지고 실패가 뒤늦게 되돌리는 구조라, 증상은 **"담은 카드가 1초 뒤 사라진다"** 였다.
목을 지운 지금 카드가 없는 계정은 빈 화면을 본다 — 그게 서버의 진실이다.

**요청:** 데모 전에 `purchase_qrs` 를 리셋하거나 새 토큰을 발급해 줄 것. 아니면 그 리셋
엔드포인트를 prod 프로필에도 열어주되 인증/권한을 걸 것.

## 7. 🟡 `CardResponse` 에 브랜드가 없다

`ProductSummary` 에 `brandId` 도 `brandName` 도 없어서, 카드 하나의 브랜드를 알려면
`GET /products/{id}` 를 한 번 더 부른다 (`hydrateCard()`). 카드 목록을 열 때 상품 조회가
카드 수만큼 따라붙는다는 뜻이다 — 상품 단위 캐시로 완화하고 있지만 왕복 자체는 남는다.

**요청:** `ProductSummary` 에 `brandId` · `brandName` 추가.

## 8. 🟡 `brands.logo_url` 이 어느 DTO 에도 없다

컬럼은 V4 부터 있고 V7 이 값을 넣는다. 저장소 전체를 훑어도 `logoUrl` 은 `Brand.java`
엔티티에만 있고 DTO 에는 없다.

프론트는 하우스의 마크를 **데이터로** 받는 것을 원칙으로 삼고 있고(AGENTS.md), 지금은 번들된
파일(`mock/brand-marks.ts`, 브랜드 UUID 로 키를 잡는다)로 대신하고 있다. 브랜드가 둘 이상이
되는 순간 이 임시방편이 무너진다.

**요청:** `ProductResponse` 또는 브랜드 DTO 에 `logoUrl` 노출.

## 9. 🟡 `rewards.reward_type` 이 노출되지 않는다

DB CHECK 는 `PHYSICAL_CARD` `GOODS` `EVENT_INVITATION` `BENEFIT` 넷을 강제하는데,
`UnlockTarget.type` 은 `REWARD`/`EVENT` 로만 갈린다. 그래서 프론트의 `RewardKind` 는 실질적으로
둘이고, "무엇을 받는가"에 따라 버튼 문구를 바꾸는 설계가 절반만 산다.

**요청:** `UnlockTarget` 또는 `UserRewardResponse` 에 `rewardType` 추가.

## 10. 🟡 이벤트를 조회할 수 없다

`events` 테이블이 있고 `UnlockTarget` 이 `type: "EVENT"` 로 이름까지 주지만, 이벤트를 여는
컨트롤러가 없다. 신청도 상세도 불가능하다.

프론트는 이 때문에 이벤트 화면을 지웠다 — 컨트롤러 없는 도메인에는 화면을 두지 않는다.
엔드포인트가 생기면 화면이 함께 돌아온다.

**요청:** `GET /events/{id}` 최소 하나. 신청까지면 더 좋다.

## 11. 🟡 케어·수선 엔드포인트가 없다

기획서 §9 의 보증·수선·케어 안내에 대응하는 API 가 없다. `products.care_info` ·
`warranty_info` · `warranty_months` 는 `GET /products/{id}` 로 오므로 **읽을 거리는 있고**,
없는 것은 신청·예약 쪽이다.

## 12. 🟢 `AI_ENABLED` 가 실서버에서 켜져 있는지 확인 안 됨

`application.yml` 기본값이 `false` 이고, 꺼져 있으면 워커가 아무것도 집지 않아 모든 리소스가
`PENDING` 에 머문다. 프론트에서는 "영원히 만드는 중"으로 보이고 오류가 아니라서 구분이 안 된다.

**요청:** 실서버의 `AI_ENABLED` / `OPENAI_API_KEY` 설정 여부 확인.

---
