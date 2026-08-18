# 구현 범위 — 기획서 × 백엔드 대조

기준일: 2026-08-19
백엔드: `greenbee02/LIKELION-Hackathon-BackEnd` @ main (마지막 푸시 2026-08-18)
Base URL: `/api/v1` · 인증 `Authorization: Bearer {accessToken}` · 성공 `{"data":…}` / 오류 `{"code","message"}`

---

## 1. 백엔드에 실제로 존재하는 API

컨트롤러 3개가 전부다. `catalog` 패키지는 Entity/Repository만 있고 컨트롤러가 없다.

### auth
| Method | Endpoint |
|---|---|
| POST | `/auth/signup` |
| POST | `/auth/login` |
| POST | `/auth/oauth/exchange` |
| GET | `/auth/me` |
| DELETE | `/auth/me` (소프트 탈퇴) |

소셜 로그인은 `GET /oauth2/authorization/{google\|kakao}` → 백엔드가 프론트의
`/oauth/callback?code={1회용 코드}` 로 리다이렉트 → `POST /auth/oauth/exchange` 로 JWT 교환 (코드 유효 2분, 1회).

### card
| Method | Endpoint |
|---|---|
| POST | `/cards/registrations` (body: `{"qrToken"}`) |
| GET | `/cards` |
| GET | `/cards/{cardId}` |
| POST | `/cards/{cardId}/customizations` |
| GET | `/cards/{cardId}/customizations` |
| POST | `/cards/{cardId}/customizations/{customizationId}/select` |
| POST | `/cards/{cardId}/restore-original` |

### ai-resources
| Method | Endpoint |
|---|---|
| POST | `/cards/{cardId}/ai-resources` → 202 + `PENDING` |
| GET | `/cards/{cardId}/ai-resources` |
| GET | `/cards/{cardId}/ai-resources/{resourceId}` |
| POST | `/cards/{cardId}/ai-resources/compose` |

`resourceType`: `BACKGROUND` `BORDER` `PATTERN` `PRODUCT_ANGLE` `DECORATION` `COLOR_PALETTE` `TEXT_STYLE` `COMPOSITION`
`generationStatus`: `PENDING → COMPLETED | FAILED | REJECTED | ARCHIVED`

### DB에는 있으나 API가 0인 영역
`collections` · `collection_cards` · `rewards` · `events` · `collection_rewards` · `user_rewards` · `physical_cards` · AI 분석/추천

백엔드 자체 문서(`docs/mvp-scope.md`)도 **카드 커스텀 / 컬렉션 관리 / 리워드·매장 수령 / AI 추천 / 운영자 기능**을 후순위로 명시했다.

---

## 2. `CardResponse` 실제 필드

```
id, originalCardType, cardType, status, purchaseDate, issuedAt, serialNumber
product   { id, name, offeringType, category, imageUrl, limited }
store     { id, name, country, city }
template  { id, name, frontImageUrl, backImageUrl, allowedCardType }
selectedCustomization { id, status, generatedFrontImageUrl, generatedBackImageUrl, generatedMessage, createdAt }
```

`cardType`: `BASIC` `CUSTOMIZE` `COLLECTOR` / `status`: `ACTIVE` `BLOCKED` `REVOKED`

**여기 없는 것** — `brand`, `product.material`, `product.origin`, `product.warrantyInfo`,
`product.warrantyMonths`, `product.careInfo`, `product.season`, `product.region`, `product.price`.
전부 `products` 테이블에는 컬럼이 있으나 DTO로 노출되지 않는다.

---

## 3. 기획서 기능 × 백엔드 지원

| 기획서 | 백엔드 | 판정 |
|---|---|---|
| §4 QR 스캔 → 카드 발급 | `POST /cards/registrations` | ✅ |
| §4 카드 앞면 정보 (상품명·이미지·구매일·매장·시리얼) | `CardResponse` | ✅ (브랜드명만 없음) |
| §4·§9 상세 (소재·원산지·보증기간·케어) | DB 컬럼만, API 미노출 | ❌ **막힘** |
| §9 공식 수선/케어 서비스 링크 | 스키마에도 없음 | ❌ 없음 |
| §5 Basic / Limited Edition | `cardType` + `product.limited` | ✅ (명칭은 `COLLECTOR`) |
| ~~§6 실물 카드~~ | `physical_cards` DB만 | ⬛ **범위 외** (2026-08-19 제외) |
| §7 내 카드 목록 | `GET /cards` | ✅ |
| §7 필터 — 카테고리 | `product.category` | ✅ |
| §7 필터 — 지역 | `store.city` 로 대체 가능 | ⚠️ 우회 |
| §7 필터 — 시즌 / 공식 컬렉션 | 미노출 | ❌ |
| §7 사용자 컬렉션 폴더 | `collections` DB만 | ❌ **막힘** |
| §8 커스텀 카드 | AI 리소스 생성 + compose | ⚠️ **방향 상충** (아래 4-A) |
| §8 SNS 공유 | 클라이언트 단독 | ✅ FE only |
| §10 리워드 | DB + 시드만, API 0 | ❌ **막힘** |

---

## 4. 결정 사항 (2026-08-19 확정)

### A. 커스텀 카드 — **AI 생성 방식으로 확정 ✅**

백엔드가 OpenAI Images API 로 배경·테두리·패턴·상품각도를 **생성**하고, 프론트는 그 결과를
받아 띄운다. 기획서 §8 의 "프리셋 조합" 문구는 이 결정으로 대체된다.

- UI 는 프리셋 그리드 형태를 유지하되, **각 타일의 소스가 `ai-resources` 결과물**이다.
  사용자에겐 "브랜드가 승인한 후보 중 고르기"로 보이고, 백엔드 계약은 그대로 쓴다.
- **"실시간"의 실체는 폴링이다.** `POST /ai-resources` 는 202 + `PENDING` 만 주고 SSE·WebSocket
  이 없으므로, `GET /cards/{cardId}/ai-resources` 를 주기적으로 재조회해야 한다.
  → 타일별 스켈레톤 → 완료된 것부터 순차 표시 → `FAILED`/`REJECTED` 는 해당 타일만 실패 처리.
  생성이 수 초~수십 초 걸리므로 **이 대기 구간이 커스텀 화면 UX 의 절반이다.**
  푸시가 필요해지면 백엔드에 SSE 를 요청한다 (해커톤 범위에선 폴링으로 충분).

### B. 리워드 — **품목 미정, 구조만 확정 ⚠️**

리워드로 무엇을 줄지는 **아직 정해지지 않았다.** "런웨이 초대권" 같은 브랜드 이벤트 쪽을
검토 중이며, 확정된 것은 없다. 기획서 §10 의 "카드 5장 → 비매품" 예시도 확정이 아니다.

품목이 미정이므로 **화면은 품목을 하드코딩하지 않고 데이터로 받는다.** 리워드 하나는 최소한
`{ brand, kind, title, threshold, progress, state }` 를 갖고, `kind` 에 따라 CTA 가 분기한다:

| `kind` | 예 | CTA |
|---|---|---|
| `EVENT` | 런웨이 초대권 | 초대 확인 / QR 제시 |
| `BENEFIT` | 프리미엄 케어 | 혜택 사용하기 |
| `GOODS` | 한정 굿즈 | 매장에서 수령 — **존치 여부 미확인** |

실물 카드가 범위에서 빠지면서 시드 리워드 `Seoul Collector Pass`(실물 카드)도 함께 빠진다.
기획서 §10 은 "리워드 자체가 재방문 이유가 되도록 매장 픽업"을 전제했는데, 초대권에는 픽업할
물건이 없다. `kind` 분기는 그 어긋남을 화면에서 흡수하기 위한 것이다.

해금 기준은 **백엔드 시드 쪽(`collection_rewards.required_percentage`, 공식 컬렉션 달성률)에
맞춘다.** 어차피 API 가 없어 목데이터지만, 나중에 붙일 때 갈아엎지 않아도 된다.
시드 리워드 3종 중 `Seoul Collector Pass`(실물 카드)는 제외, `AW26 Limited Card Holder`(카드 홀더)는
실물 카드가 없으면 담을 것이 없으므로 사실상 무의미하다. 남는 것은 `MCM Icons Premium Care`(혜택) 뿐이라
**리워드 목데이터는 새로 짜야 한다.**
시드 공식 컬렉션 5종: `Seoul Exclusive` `2026 New Arrivals` `Women's Signature` `Global Travel Collection` `MCM Icons`.

### C. 템플릿 목록 조회 API가 없다 — **미해결 ❌**

`POST /cards/{cardId}/customizations` 는 `templateId` 가 필수인데 템플릿 목록 엔드포인트가 없다.
프론트가 알 수 있는 건 `CardResponse.template.id` (그 카드에 이미 붙은 것) 하나뿐이다.
→ 커스텀 화면을 제대로 만들려면 `GET /card-templates` 가 필요하다.

---

## 5. 백엔드에 요청할 것 (우선순위 순)

1. **`CardResponse` 에 `brand` 추가** — 최소 `{ id, name }`, 가능하면 로고·액센트까지.
   **멀티 브랜드 플랫폼이므로 이건 표시용 필드가 아니라 화면의 전제다.** 카드가 어느 브랜드 것인지 모르면 통합 컬렉션 화면도, 브랜드별 필터도, 브랜드 귀속 리워드도 그릴 수 없다.
   `brands` 테이블이 이미 있고 `products`·`stores`·`card_templates`·`rewards` 전부 `brand_id` 로 묶여 있으므로 DTO 매핑만 추가하면 된다.
2. **`CardResponse.product` 에 상세 필드 추가** — `material`, `origin`, `warrantyInfo`, `warrantyMonths`, `careInfo`, `season`, `region`.
   컬럼이 이미 있으므로 DTO 매핑만 추가하면 된다. 없으면 §9 디지털 패스포트 화면 전체가 목데이터다.
3. **`GET /card-templates`** — 커스텀 화면 진입 조건.
4. **사용자 컬렉션 CRUD** — `GET/POST /collections`, `POST/DELETE /collections/{id}/cards`.
5. **리워드 조회** — `GET /rewards` (브랜드별 진행률 포함), `POST /rewards/{id}/claim`.
6. 수선/케어 링크 필드 (스키마 추가 필요, 최하위).

1번은 다른 무엇보다 먼저다. 1·2번이 나오면 프론트가 목데이터에서 벗어나는 범위가 크게 넓어진다.

---

## 6. 화면 범위

> **현재 리포에는 화면이 하나도 없다.** Next.js 스캐폴드가 삭제되고 Expo 로 갈아엎히면서
> `src/app/` 에 남은 것은 `_layout.tsx` 와 반경 실험용 `index.tsx`(RadiusPlayground) 뿐이다.
> 아래 표의 화면은 전부 신규 구현이다.

### Tier 1 — 백엔드가 있어 실제로 붙일 수 있는 화면

| 화면 | 라우트 | API |
|---|---|---|
| 로그인 | `/sign-in` | `POST /auth/login` |
| 회원가입 | `/sign-up` | `POST /auth/signup` |
| OAuth 콜백 | `/oauth/callback` | `POST /auth/oauth/exchange` |
| QR 스캔 | `/scan` | `POST /cards/registrations` |
| 발급 연출 | 스캔 성공 후 모달/전면 | 위와 동일 |
| 내 컬렉션 | `/(tabs)/index` | `GET /cards` |
| 카드 상세 | `/card/[id]` | `GET /cards/{id}` |
| 마이페이지 / 탈퇴 | `/(tabs)/profile` | `GET·DELETE /auth/me` |
| SNS 공유 | `/share/[id]` | 없음 (FE 단독) |

발급 연출은 기획서에 항목으로 없지만 제품의 감정적 핵심이라 별도 화면으로 잡는다.
내 컬렉션의 **브랜드 필터는 `CardResponse.brand` 가 나오기 전까지 그릴 수 없다** (5-1).

`/scan` 은 에러코드 4종 분기 UI가 필요하다 — `QR_TOKEN_INVALID` `QR_ALREADY_USED` `QR_EXPIRED` `CARD_TEMPLATE_NOT_FOUND`.
(현재 프론트는 "이미 등록된 영수증" 한 가지만 처리)
데모용 QR 토큰은 시드에 `MCM-DEMO-2026-001` … `-010` 로 준비돼 있다.

### Tier 2 — 백엔드는 있으나 UI 방향 결정이 선행

| 화면 | 라우트 | 블로커 |
|---|---|---|
| 카드 커스텀 | `/card/[id]/edit` | 4-C 템플릿 목록 API (4-A 방향은 확정됨) |

### Tier 3 — 백엔드 없음, 목데이터 유지

| 화면 | 라우트 | 비고 |
|---|---|---|
| 리워드 | `/(tabs)/rewards` | 품목 미정 · `kind` 분기 구조로 (4-B) |
| 컬렉션 폴더 | 드롭다운 (`/(tabs)/index`) | 클라 파생 필터. `collections` API 나오면 그대로 대체 |
| 디지털 패스포트 상세 | `/card/[id]` 하단 | 5-2 나오면 실데이터 |

---

## 7. 전송 계층

`src/lib/cards-store.tsx` 를 API 클라이언트 뒤로 한 번 더 감싼다.

- `src/lib/api/client.ts` — base URL, `Bearer` 헤더, `{data}` 언랩, `{code,message}` → 타입드 에러
- `src/lib/api/cards.ts` / `auth.ts` — 엔드포인트별 함수
- 토큰은 AsyncStorage (`expo-secure-store` 로 승급 여지)
- 각 화면은 store 훅만 보고, mock ↔ live 는 store 안에서 전환

`purchaseDate`/`issuedAt` 은 ISO-8601 UTC (`Instant`) 이므로 파싱 시 로컬 변환이 필요하다.
