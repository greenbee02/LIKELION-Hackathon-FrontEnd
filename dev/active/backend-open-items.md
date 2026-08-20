# 미결 — 막힌 것과 백엔드에 요청할 것

기준: `a76ac03` (2026-08-20) · 실서버 `http://1.201.117.14` 실측
갱신일: 2026-08-20

계약 자체는 `backend-contract.md`. 여기에는 **아직 해결되지 않았거나, 프론트 혼자서는 못 푸는
것**만 적는다. 해결되면 줄을 지운다 — 해결된 항목을 "해결됨"으로 남겨두면 다음 사람이 그것도
읽어야 한다.

---

## 1. 🟡 CORS 허용 목록에 Vercel 오리진이 없다

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

## 2. 🟡 평문 HTTP — iOS ATS

`http://1.201.117.14`. iOS 개발 빌드는 ATS 예외가 필요하고, 앱 스토어 심사는 통과하지 못한다.
데모 범위에서는 감수하되, 도메인 + TLS 가 붙으면 `.env` 와 `vercel.json` **두 곳**을 고쳐야 한다.

## 3. 🔴 데모 QR 토큰이 소진됐다

시드(`V7`)에 `MCM-DEMO-2026-001` ~ `-011` 열한 개가 `is_used = FALSE` 로 들어 있지만, 지금
DB 상태는 다르다 — 스캔하면 `QR_ALREADY_USED` 가 돌아온다. 토큰은 한 번 쓰면 소멸한다.

`POST /api/v1/local/demo/reset` 이 있지만 `@Profile({"local","test"})` 라 **실서버에 없다.**

**요청:** 데모 전에 `purchase_qrs` 를 리셋하거나 새 토큰을 발급해 줄 것. 아니면 그 리셋
엔드포인트를 prod 프로필에도 열어주되 인증/권한을 걸 것.

## 4. 🟡 `CardResponse` 에 브랜드가 없다

`ProductSummary` 에 `brandId` 도 `brandName` 도 없어서, 카드 하나의 브랜드를 알려면
`GET /products/{id}` 를 한 번 더 부른다 (`hydrateCard()`). 카드 목록을 열 때 상품 조회가
카드 수만큼 따라붙는다는 뜻이다 — 상품 단위 캐시로 완화하고 있지만 왕복 자체는 남는다.

**요청:** `ProductSummary` 에 `brandId` · `brandName` 추가.

## 5. 🟡 `brands.logo_url` 이 어느 DTO 에도 없다

컬럼은 V4 부터 있고 V7 이 값을 넣는다. 저장소 전체를 훑어도 `logoUrl` 은 `Brand.java`
엔티티에만 있고 DTO 에는 없다.

프론트는 하우스의 마크를 **데이터로** 받는 것을 원칙으로 삼고 있고(AGENTS.md), 지금은 번들된
파일로 대신하고 있다. 브랜드가 둘 이상이 되는 순간 이 임시방편이 무너진다.

**요청:** `ProductResponse` 또는 브랜드 DTO 에 `logoUrl` 노출.

## 6. 🟡 `rewards.reward_type` 이 노출되지 않는다

DB CHECK 는 `PHYSICAL_CARD` `GOODS` `EVENT_INVITATION` `BENEFIT` 넷을 강제하는데,
`UnlockTarget.type` 은 `REWARD`/`EVENT` 로만 갈린다. 그래서 프론트의 `RewardKind` 는 실질적으로
둘이고, "무엇을 받는가"에 따라 버튼 문구를 바꾸는 설계가 절반만 산다.

**요청:** `UnlockTarget` 또는 `UserRewardResponse` 에 `rewardType` 추가.

## 7. 🟡 이벤트를 조회할 수 없다

`events` 테이블이 있고 `UnlockTarget` 이 `type: "EVENT"` 로 이름까지 주지만, 이벤트를 여는
컨트롤러가 없다. 신청도 상세도 불가능하다.

프론트는 이 때문에 이벤트 화면을 지웠다 — 컨트롤러 없는 도메인에는 화면을 두지 않는다.
엔드포인트가 생기면 화면이 함께 돌아온다.

**요청:** `GET /events/{id}` 최소 하나. 신청까지면 더 좋다.

## 8. 🟡 케어·수선 엔드포인트가 없다

기획서 §9 의 보증·수선·케어 안내에 대응하는 API 가 없다. `products.care_info` ·
`warranty_info` · `warranty_months` 는 `GET /products/{id}` 로 오므로 **읽을 거리는 있고**,
없는 것은 신청·예약 쪽이다.

## 9. 🟢 `AI_ENABLED` 가 실서버에서 켜져 있는지 확인 안 됨

`application.yml` 기본값이 `false` 이고, 꺼져 있으면 워커가 아무것도 집지 않아 모든 리소스가
`PENDING` 에 머문다. 프론트에서는 "영원히 만드는 중"으로 보이고 오류가 아니라서 구분이 안 된다.

**요청:** 실서버의 `AI_ENABLED` / `OPENAI_API_KEY` 설정 여부 확인.

---

## 해결된 것 (다음 갱신 때 지운다)

이전 문서가 블로커로 적어두었으나 지금은 해결된 항목. 프론트 코드에 그 시절의 우회가 남아
있으므로 지우기 전에 한 번씩 확인한다.

| 항목 | 상태 | 프론트에 남은 흔적 |
|---|---|---|
| `/images/**` 가 인증 뒤에 있었다 | ✅ permitAll, 실측 `200 image/png` | `src/lib/card-art.ts` 의 `authorized()` · `useProtectedImage()` · `client.ts` 의 `getAccessToken()` 노출 |
| CORS 가 아예 없었다 | ✅ 존재. 목록만 부족 (§1) | — |
| `GET /card-templates` 가 없었다 | ✅ 있다 | — |
| 생성물 경로가 막혀 있었다 | ✅ `/generated/ai-resources/**` permitAll | — |
