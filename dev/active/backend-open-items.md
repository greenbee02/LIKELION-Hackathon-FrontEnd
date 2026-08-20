# 미결 — 막힌 것과 백엔드에 요청할 것

기준: `f7ce5f1` (2026-08-21 00:54 KST) · 실서버 `http://1.201.117.14` 실측
갱신일: 2026-08-21

계약 자체는 `backend-contract.md`. 여기에는 **아직 해결되지 않았거나, 프론트 혼자서는 못 푸는
것**만 적는다. 해결되면 줄을 지운다 — 해결된 항목을 "해결됨"으로 남겨두면 다음 사람이 그것도
읽어야 한다.

---

## 1. 🟡 V13 이 배포되지 않았다 — 리워드·이벤트 이미지가 전부 `null`

배포된 빌드는 `e35288b`(14:58Z) 이상 `f7ce5f1`(15:54Z) 미만이다. 그 사이에 들어온 것이
V13 과 이미지 6장이라, `/images/rewards/reward_001_seoul_collector_pass.png` 는 404 이고
`GET /rewards/progress/{collectionId}` 의 `targets[].imageUrl` 도 `coverImageUrl` 도
비어 있다 (2026-08-21 실측).

컬럼은 V6 부터 있었으므로 **모자란 것은 스키마가 아니라 배포**다.

**요청:** `main` 최신(`f7ce5f1`)으로 재배포. 리워드 화면에 이미지를 넣는 작업은 그 전까지
빈 자리를 그리게 된다.

## 2. 🟡 데모 리셋이 인증 없이 열려 있다

`POST /api/v1/local/demo/reset` 이 `@Profile({"local","test","prod"})` 로 바뀌고 SecurityConfig
의 `permitAll` 에 들어갔다 (`e35288b`). **토큰 없이 누구나 부를 수 있고**, 부르면 데모 QR
열한 개에 매달린 카드가 전부 지워진다. 시연 도중 누가 눌러도 그렇다.

백엔드도 알고 있다 — 코드 주석이 "발표 후에는 prod 를 제거하거나 관리자/데모 키 인증으로
교체한다"고 적어두었다.

**요청:** 데모 키 헤더 하나라도 걸 것. 프론트는 그 헤더를 넣기만 하면 된다.

**프론트가 이것에 기대고 있다** — `src/lib/api/local-demo.ts` 의 `resetLocalDemo()` 가
소진된 QR 을 되살리는 유일한 길이다. 인증이 붙으면 그 함수도 함께 고친다.

## 3. 🟡 `CustomizationSummary` 에 레이어가 없다 — 목록에서 꾸민 얼굴을 못 그린다

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

## 4. 🟡 문구 레이어의 `style` 에 계약이 없다

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

## 5. 🟡 CORS 허용 목록에 Vercel 오리진이 없다

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

## 6. 🟡 평문 HTTP — iOS ATS

`http://1.201.117.14`. iOS 개발 빌드는 ATS 예외가 필요하고, 앱 스토어 심사는 통과하지 못한다.
데모 범위에서는 감수하되, 도메인 + TLS 가 붙으면 `.env` 와 `vercel.json` **두 곳**을 고쳐야 한다.

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

## 9. 🟡 `rewards.reward_type` 이 목록과 `/my` 에 없다

`GET /rewards/progress/{collectionId}` 가 `targets[].reward.rewardType` 으로 이 값을 처음
내보낸다 (`e35288b`). 그러나 목록(`GET /rewards/progress`)의 `UnlockTarget` 은 여전히
`REWARD`/`EVENT` 로만 갈리고, `UserRewardResponse` 에도 없다.

그래서 "무엇을 받는가"로 문구를 바꾸려면 **컬렉션 상세를 먼저 부른 화면**만 그렇게 할 수 있고,
보유 리워드 목록은 못 한다.

**요청:** `UserRewardResponse` 에 `rewardType` 추가. 목록 쪽 `UnlockTarget` 에도 있으면 좋다.

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

## 13. 🟡 상품 사진의 피사체 크기가 제각각이다 — 액자를 아무리 줄여도 여백이 남는다

`/images/products/prod_001..011.png` 열한 장 전부 2000×2164(비율 0.924)에 `#f7f7f7` 배경이
구워져 있다. 그런데 상품이 프레임에서 차지하는 넓이가 사진마다 다르다 — 실물 크기 비율대로
찍혀 있어서, 수트케이스는 프레임을 채우고 여권 케이스는 가운데 아래에 작게 놓인다.

세로 위치를 실측하면(2026-08-21):

```
prod_005 백팩       y 0.13–0.89   상단 여백 0.13   ← 가장 꽉 찬 사진
prod_001 셔츠       y 0.14–0.85   상단 여백 0.14
prod_010 쇼퍼       y 0.21–0.88   상단 여백 0.21
prod_007 여권 케이스 y 0.49–0.88   상단 여백 0.49   x 0.35–0.65
prod_009 샌들       y 0.65–0.88   상단 여백 0.65   ← 프레임의 23% 만 상품
```

**아래 여백은 0.11–0.15 로 일정하고 위만 벌어진다** — 바닥선은 맞춰져 있고 높이가 안 맞는다.

프론트는 `cover` 로 프레임을 잘라 여백을 걷어내지만, 잘라낼 수 있는 양을 정하는 것은 가장
꽉 찬 사진(`prod_005`)이라 한계가 비율 1.216 이다. 그래서 발급 미리보기의 히어로는 1.2 에
멈춰 있고, 여권 케이스나 샌들에서는 그래도 위쪽 절반이 빈 채로 남는다. 자르는 쪽을 아래로
치우쳐도 마찬가지다 — 위를 더 잘라내는 순간 `prod_005` 의 윗단이 잘린다.

**요청:** 상품 사진의 피사체 크기를 정규화할 것. 실물 비례가 아니라 **모든 사진에서 상품이
프레임의 같은 비율(예: 세로 0.10–0.90)을 차지하도록** 다시 잘라 주면 된다. 카탈로그 타일과
상품 상세 히어로도 같은 사진을 쓰므로 세 화면이 한 번에 고쳐진다.

---
