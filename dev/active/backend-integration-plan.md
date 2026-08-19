# 백엔드 연동 계획

기준일: 2026-08-20
백엔드: `greenbee02/LIKELION-Hackathon-BackEnd` @ main (마지막 푸시 2026-08-19 14:33)
서버: `http://1.201.117.14` · Base URL `/api/v1` · Swagger `http://1.201.117.14/swagger-ui/index.html`

이 문서는 **살아 있는 서버에 직접 요청해서 확인한 내용**이다. `/v3/api-docs` 를 받아 스펙을
읽고, 공개 엔드포인트는 그대로 호출했으며, 인증 구간은 임시 계정(`curio-fe-probe@example.com`)을
만들어 확인한 뒤 `DELETE /auth/me` 로 지웠다. QR 토큰은 한 번 쓰면 소멸하므로
`POST /cards/registrations` 만 호출하지 않았다 — 데모용 토큰을 태우는 일은 되돌릴 수 없다.

**`dev/active/scope-vs-backend.md` §1·§3·§4·§5 는 이 문서로 대체된다.** 그 문서가 "막힘"으로
적어둔 항목 대부분이 열렸다.

---

## 1. 08-19 이전과 달라진 것

| 항목 | 이전 기록 | 지금 |
|---|---|---|
| 카드 템플릿 목록 | ❌ 없음 (커스텀 화면 블로커) | ✅ `GET /card-templates` |
| 공식 컬렉션 | ❌ API 0 | ✅ `GET /product-collections` (+ `/{id}/products`) |
| 상품 상세 | ❌ DTO 미노출 | ✅ `GET /products/{id}` — 소재·원산지·보증·케어·제품번호 전부 |
| 브랜드 | ❌ 없음 | ⚠️ `ProductResponse.brandId/brandName` 으로만. `CardResponse` 에는 여전히 없음 |
| 사용자 컬렉션 | ❌ API 0 | ✅ `GET/POST/PATCH/DELETE /collections` + 카드 추가/제거 |
| 리워드 | ❌ API 0 | ✅ `GET /rewards/progress` · `GET /rewards/my` · `POST /rewards/{id}/claim` |

컨트롤러가 3개에서 8개로 늘었다. **프론트가 목데이터로 그려둔 화면 중 리워드·카드 상세가
실데이터로 갈 수 있게 됐다는 뜻**이고, 이 계획의 대부분은 그 두 화면이다.

---

## 2. 핵심 결정 — 카드는 상품으로 한 번 더 채운다 (hydrate)

`CardResponse.product` 는 `ProductSummary` 이고 여기엔 6개 필드밖에 없다:

```
ProductSummary { id, name, offeringType, category, imageUrl, limited }
```

브랜드도, 소재도, 보증도, 제품 번호도 없다. 그런데 `GET /products/{productId}` 가 주는
`ProductResponse` 에는 **전부 있다** — `brandId` `brandName` `productCode` `material` `color`
`origin` `warrantyInfo` `warrantyMonths` `careInfo` `season` `region` `theme` `price` `description`.

그래서 연동 방식은 이렇게 잡는다:

```
GET /cards            → Card[] (뼈대)
GET /products/{id}    → 카드마다 한 번, 상품 상세로 채움
```

- **`GET /products/**` 는 인증이 필요 없다** (`SecurityConfig` permitAll). 토큰 만료와 무관하게 붙는다.
- 카드 N장이면 요청 N+1번이지만, 상품 수는 카드 수보다 적고 **상품 단위로 캐시하면 실제로는
  고유 상품 개수만큼**이다. 데모 규모(10장 내외)에서 문제될 양이 아니다.
- 이건 임시방편이 아니라 **정상 경로**다. 나중에 `ProductSummary` 가 넓어지면 hydrate 함수가
  사라질 뿐, 화면은 하나도 바뀌지 않는다.
- `price` 는 받되 **화면에 쓰지 않는다.** 얼마 줬는지 적는 순간 수집품이 영수증이 된다
  (scope-vs-backend §5 의 결정을 유지).

`toCard()` 가 시리얼 접두사에서 브랜드를 추측하던 3줄은 이 단계에서 지워진다.

---

## 3. 프론트 코드와 실제 응답의 불일치 (전부 고쳐야 함)

확인된 것만 적는다. 추측은 없다.

### 3-1. 인증 — `src/lib/api/auth.ts`

| 프론트 현재 | 실제 |
|---|---|
| `signup()` 이 `AuthTokens` 반환 가정 | **`201` + `UserResponse`. 토큰이 없다** — 가입 후 `login` 을 이어 호출해야 함 |
| `signup(email, password, nickname)` | 필드명이 `name` 이다 (`SignupRequest { email, password, name }`) |
| `AuthUser { id, email, nickname }` | `UserResponse { id, email, name, role }` — `role`: `CUSTOMER \| STAFF \| ADMIN` |
| `AuthTokens { accessToken, refreshToken? }` | `AuthResponse { accessToken, user, expiresInSeconds }` — **리프레시 토큰이 없다** |
| 로그인 후 `/auth/me` 호출 | 불필요. `login` 응답이 `user` 를 같이 준다 |

**리프레시 토큰이 없다는 게 설계 조건이다.** JWT 유효기간은 실측 86400초(24시간)이고 갱신
수단이 없으므로, 만료되면 재로그인뿐이다. `expiresInSeconds` 를 만료 시각으로 환산해 저장하고,
지났으면 복원 단계에서 곧바로 `signed-out` 으로 보낸다 — 만료된 토큰으로 화면을 그린 뒤
첫 요청에서 401을 맞는 것보다, 문 앞에서 되돌리는 편이 낫다.

에러 바디는 `{"code","message"}` 이고 **message 가 이미 한국어**다
(`{"code":"INVALID_CREDENTIALS","message":"이메일 또는 비밀번호가 올바르지 않습니다."}`).
`messageFor()` 의 기본 분기가 그대로 쓸 만하다.

### 3-2. AI 리소스 — `src/lib/api/ai-resources.ts`

프론트 타입이 **필드명 세 개를 다 틀렸다.** 지금 붙이면 전부 `undefined` 다.

| 프론트 | 실제 (`AiResourceGenerationResponse`) |
|---|---|
| `imageUrl` | `generatedImageUrl` (+ 이미지 아닌 결과는 `generatedData`) |
| `generationStatus` | `status` |
| — | `failureReason` 이 따로 있다 (실패 타일에 쓸 수 있음) |

요청 형태도 다르다. 프론트는 `POST /ai-resources` 에 `{resourceTypes: [...]}` 를 보내는데,
그 엔드포인트는 **한 건짜리** `AiResourceGenerationRequest { resourceType, templateId, prompt,
sourceImageUrl, options }` 를 받는다. 여러 개는 **`POST /ai-resources/batch`** 에
`{ resources: [ {resourceType, prompt}, … ] }` 로 보낸다. → `requestAiResources()` 는
batch 로 갈아탄다.

**`PRODUCT_ANGLE` 은 발급 배치에서 뺀다.** 원본 상품 이미지를 외부에서 접근 가능한 HTTP(S)
URL 로 받아야 하는데, 시드의 `imageUrl` 은 `/images/products/prod_001.png` 이고 이 경로는
인증이 걸려 있다(아래 4-3). 나머지 3종(배경·테두리·패턴)은 원본 이미지를 쓰지 않으므로 그대로 간다.

### 3-3. 리워드 — 타입을 다시 짠다

프론트 `Reward` 는 한 덩어리인데, 백엔드는 **두 리스트로 나눠 주고 프론트가 조인해야 한다.**

```
GET /rewards/progress → 공식 컬렉션별 진행률 + 해금 대상
  { collectionId, collectionName, requiredProductCount, ownedRequiredProductCount,
    percentage, targets: [ { type: 'EVENT'|'REWARD', id, name, requiredPercentage, unlocked } ] }

GET /rewards/my → 이미 해금된 것만
  { id(=userRewardId), targetType, targetId, name, status, claimCode, unlockedAt, expiresAt }
```

- 조인 키는 `UserRewardResponse.targetId` ↔ `UnlockTarget.id`.
- **`LOCKED` 이 프론트 자체 상태라는 기존 판단이 맞았다.** `/rewards/my` 는 해금 전에는 빈
  배열이고(실측), 잠긴 것은 `progress[].targets[].unlocked === false` 로만 알 수 있다.
- **`progress` / `total` 이 장수가 아니라 퍼센트다.** 해금 조건은 `requiredPercentage` 이고
  분모는 `requiredProductCount` 다. "앞으로 N장" 은
  `ceil(requiredPercentage/100 × requiredProductCount) − ownedRequiredProductCount` 로 계산한다.
- **없어서 못 쓰는 것**: `note`, `claimedStore` — 스키마에도 화면 근거가 없으므로 타입에서 뺀다.
  `claimedAt` 은 `unlockedAt` 으로 대체하되, 의미가 "해금된 날"이지 "쓴 날"이 아니라는 점을
  카피에 반영해야 한다.
- **`kind` 3분기가 2분기로 줄어든다.** `UnlockTarget.type` 은 `EVENT` 와 `REWARD` 뿐이고,
  `rewards.reward_type`(`PHYSICAL_CARD`/혜택/굿즈)은 DTO에 없다. `BENEFIT` 과 `GOODS` 를
  구분할 근거가 응답에 없으므로, `rewardType` 을 백엔드에 요청하기 전까지는
  `EVENT → 초대 확인하기` / `REWARD → 혜택 사용하기` 로 간다.
- **리워드에 브랜드가 없다.** `RewardProgressResponse` 에 `brandId/brandName` 이 없어서,
  브랜드는 `collectionId` → `GET /product-collections` 로 뒤집어 찾아야 한다. 지금 시드는
  브랜드가 MCM 하나뿐이라 그룹 헤딩은 어차피 안 그려지지만(브랜드가 둘 이상일 때만 그린다),
  경로는 만들어 둔다.
- 수령은 `POST /rewards/{userRewardId}/claim` 이 `claimCode` 를 **발급**한다. 즉 코드 화면은
  "이미 있는 코드를 보여주는" 게 아니라 **버튼을 눌러야 코드가 생긴다.** 운영 정책 문서상
  매장 직원이 `CLAIMED` 로 바꾸는 API 는 아직 없다 — 코드 발급까지가 MVP 범위다.

### 3-4. 카드 발급 에러코드가 4개가 아니다

프론트는 4개를 분기하는데 실제 계약서에는 발급 실패가 더 있다:
`PRODUCT_INACTIVE` `TEMPLATE_INACTIVE` `TEMPLATE_CARD_TYPE_NOT_ALLOWED` `TEMPLATE_BRAND_MISMATCH`.
전부 고객이 할 수 있는 일이 없는 "발급 불가" 한 덩어리이므로, `CARD_TEMPLATE_NOT_FOUND` 와
같은 화면으로 묶는다. 코드는 늘리되 화면은 늘리지 않는다.

### 3-5. 값이 코드로 온다

`category` 는 `SHIRT` `SCARF`, `season` 은 `FW`, `theme` 는 `NEW_ARRIVAL` 처럼 **enum 코드**다.
목데이터는 한국어 텍스트였다. 화면에 그대로 뿌리면 영문 대문자가 노출되므로
`src/lib/labels.ts` 한 곳에 코드→한국어 표를 두고, **표에 없는 코드는 원문 그대로 보여준다**
— 새 카테고리가 하나 들어왔다고 화면이 비는 것보다 낫다.

### 3-6. 시드에 값이 비어 있는 필드

실측 결과 `productCode` `origin` `warrantyInfo` `warrantyMonths` `experienceLocation` 이
**전부 null** 이다. 컬럼과 DTO는 있는데 시드가 안 채워져 있다.

→ 카드 뒷면의 보증 2줄과 시트의 제품 번호·원산지가 **조용히 사라진다.** 다만 이건 사고가 아니라
설계대로 동작하는 것이다 — "값 없는 행은 렌더하지 않는다"가 카드 뒷면의 규칙이고, 대시를
찍지 않기로 한 이유가 정확히 이 상황이다. 백엔드에 시드 보강을 요청하되(§4-5), **요청이
안 받아들여져도 화면은 깨지지 않는다.**

---

## 4. 붙이기 전에 풀어야 하는 것

### 4-1. CORS 가 없다 — 웹 익스포트는 API 를 못 부른다 🔴

```
OPTIONS /api/v1/auth/login (Origin: http://localhost:8081) → 403, Access-Control-Allow-Origin 없음
```

`SecurityConfig` 에 `.cors(...)` 설정 자체가 없다. **네이티브(Expo Go·개발 빌드)는 CORS 를
적용하지 않으므로 멀쩡히 동작하고, 웹만 전부 막힌다.**

- 데모가 폰이므로 치명적이진 않지만, AGENTS.md 는 "모든 화면이 웹에서도 동작해야 한다"를
  요구한다. → **백엔드에 `CorsConfigurationSource` 추가 요청** (1순위, 코드 10줄).

**개발 중에는 우회했다 (2026-08-20).** `metro.config.js` 가 개발 서버에 프록시를 붙여
`/api/**` · `/images/**` · `/generated/**` 를 백엔드로 대신 보낸다. 브라우저 입장에서는
같은 출처라 CORS 검사 자체가 일어나지 않는다. `src/lib/config.ts` 는 웹 + `__DEV__` 일 때만
주소를 `/api/v1` 로 줄여 그쪽을 타게 한다.

**이것은 우회이지 해법이 아니다.** 웹 익스포트에는 개발 서버가 없어 배포된 웹은 여전히
막힌다 — 확인: `expo export` 결과물에는 실제 주소 `1.201.117.14/api/v1` 이 박힌다. 백엔드가
CORS 를 열면 `metro.config.js` 와 `config.ts` 의 분기를 함께 지운다.

### 4-2. 평문 HTTP 라 iOS 가 막는다 🟡

서버가 `http://1.201.117.14` 다. iOS ATS 는 평문 HTTP 를 기본 차단한다.

- **Expo Go 개발 중에는 통과한다** (Expo Go 자체 Info.plist 가 허용).
- 개발 빌드·스탠드얼론에서는 `app.json` 에 예외를 넣어야 한다:
  `ios.infoPlist.NSAppTransportSecurity.NSExceptionDomains["1.201.117.14"]` +
  `android.usesCleartextTraffic: true`.
- 이건 **프론트에서 해결 가능**하다. 도메인+HTTPS 가 붙으면 지운다.

### 4-3. 이미지 경로가 인증 뒤에 있다 🟡

`/images/products/*.png` 는 토큰 없이 401, 토큰을 주면 200 이다(실측).
`SecurityConfig` 의 permitAll 목록에 `/generated/ai-resources/**` 는 있는데 `/images/**` 는 없다.

문제는 `<Image source={{uri}}>` 가 **헤더를 자동으로 붙이지 않는다**는 것이다.
네이티브는 `source={{uri, headers:{Authorization}}}` 로 우회할 수 있지만 **웹에서는 그 방법이
없다** — `<img>` 태그에 헤더를 실을 수 없다. 즉 4-1 을 풀어도 이미지는 여전히 안 뜬다.

→ **`/images/**` permitAll 요청** (2순위). 상품 사진은 비밀이 아니다.

개발 프록시(§4-1)도 이건 못 고친다 — 프록시는 브라우저가 보낸 것을 그대로 전달할 뿐인데,
브라우저가 `<img>` 에 토큰을 실어주지 않기 때문이다. **네이티브는 `authorized()` 가 헤더를
붙여 해결되고, 웹에서는 상품 사진이 비어 보인다.** 이 한 줄이 열리기 전까지 웹은 카드 그림이
없는 채로 동작한다.

### 4-4. OAuth 리다이렉트가 네이티브로 못 돌아온다 🟡

백엔드는 로그인 성공 후 **프론트엔드의 `/oauth/callback?code=`** 로 보낸다. 웹 주소다.
네이티브 앱에는 그런 주소가 없고 `curio://` 스킴이 있다.

→ 백엔드가 리다이렉트 대상을 설정으로 받게 하거나, `curio://oauth/callback` 을 허용 목록에
넣어달라고 요청해야 한다. 프론트는 `expo-web-browser` 의 `openAuthSessionAsync()` 로
열고 스킴으로 코드를 받는다. **코드 유효기간 2분·1회용**이라, 실패하면 재시도가 아니라
왕복 전체를 다시 시작해야 한다 — 화면이 그렇게 말해야 한다.

### 4-5. 시드 계정으로 로그인할 수 없다 🟢

`customer@example.com` 은 `password_hash` 가 **NULL** 이라 비밀번호 로그인이 안 된다.
데모용 계정을 새로 가입해서 쓰면 되고(가입은 즉시 동작 확인됨), 그 계정으로 QR
`MCM-DEMO-2026-001` … `-010` 을 스캔하면 카드가 쌓인다. **토큰은 1회용이므로 리허설에서
태우지 않도록 주의** — 10장이 전부다.

### 4-6. 탈퇴가 절반만 실행된다 🔴

`DELETE /auth/me` 는 204 를 주고 `users.deleted_at` 에 도장을 찍는다. **인증 필터는 그 도장을
읽는데, 로그인은 읽지 않는다.** 실측:

| 시도 | 결과 |
|---|---|
| 탈퇴한 이메일로 재가입 | `409 EMAIL_ALREADY_EXISTS` |
| 탈퇴한 계정으로 로그인 | **성공. accessToken 까지 발급됨** |
| 그 토큰으로 `/auth/me` · `/cards` · `/rewards/my` | **전부 401** |

`AuthService.login()` 이 `userRepository.findByEmail(email)` 뿐이라 `deleted_at IS NULL` 을
거르지 않는 반면, JWT 필터는 거른다.

**우리 앱에서 이게 만드는 증상이 구체적이다.** 로그인이 성공하므로 세션 게이트가 고객을
컬렉션으로 들여보내고, 첫 요청이 401 을 맞고, 전송 계층의 401 훅이 곧바로 로그아웃시킨다 —
고객 눈에는 로그인 버튼을 눌렀는데 로그인 화면으로 튕기는 무한 반복으로 보인다. 프론트가
고칠 수 있는 문제가 아니다: 서버가 토큰을 줬으면 그 토큰은 통해야 한다.

→ 백엔드에 **`AuthService.login()` 에 `deleted_at IS NULL` 조건 추가** 요청.

### 4-7. 비밀번호가 평문으로 전송된다 🔴

저장은 정상이다 — `AuthService:46` 이 `passwordEncoder.encode(...)` 로 BCrypt 해시를 넣는다.
문제는 **서버가 `http://` 라 TLS 가 없다는 것**이다. 로그인·회원가입 본문의 비밀번호가
네트워크 구간에 그대로 흐른다. DB 는 안전한데 도착하기 전에 새는 구조다.

- 4-2(iOS ATS)와 같은 뿌리이고, **해법도 같다: HTTPS.** 도메인 + 인증서가 붙으면 둘 다 사라진다.
- 그때까지 **데모 계정에 실제로 쓰는 비밀번호를 넣지 않는다.** 팀·심사 안내에 포함할 것.

---

### 4-8. 데모 QR 토큰이 전부 소진됐다 🔴

시드의 구매 QR 은 `MCM-DEMO-2026-001` … `-011` 열한 개이고 **한 번 쓰면 소멸한다.**
2026-08-20 연동 검증 과정에서 그중 **열 개(002~011)를 프론트 확인용 계정이 소진했다.**
001 은 그 전에 이미 사용된 상태였다. 즉 **지금 남은 데모 토큰은 없다.**

시드의 `MCM-2026-SEOUL-001` 같은 도시 문자열은 **QR 토큰이 아니라 `purchase_qrs.serial_number`**
다 — 스캔하면 `QR_TOKEN_INVALID` 가 난다. 토큰과 시리얼이 서로 다른 값이라는 것은 이때 확인했다.

되돌리려면 백엔드에서 아래를 실행한다. `purchase_qrs` 의 3중 CHECK 때문에 세 컬럼을 함께
되돌려야 하고, 카드를 먼저 지워야 FK 가 풀린다.

```sql
-- 확인용 계정 두 개가 만든 것만 되돌린다
WITH probe AS (
  SELECT id FROM users
   WHERE email IN ('curio-fe-verify@example.com', 'curio-fe-probe@example.com')
)
UPDATE purchase_qrs SET is_used = FALSE, used_by = NULL, used_at = NULL
 WHERE id IN (SELECT purchase_qr_id FROM cards WHERE user_id IN (SELECT id FROM probe));

DELETE FROM ai_resource_generations
 WHERE card_id IN (SELECT id FROM cards WHERE user_id IN (SELECT id FROM users
   WHERE email IN ('curio-fe-verify@example.com','curio-fe-probe@example.com')));

DELETE FROM collection_cards
 WHERE card_id IN (SELECT id FROM cards WHERE user_id IN (SELECT id FROM users
   WHERE email IN ('curio-fe-verify@example.com','curio-fe-probe@example.com')));

DELETE FROM cards WHERE user_id IN (SELECT id FROM users
  WHERE email IN ('curio-fe-verify@example.com','curio-fe-probe@example.com'));

DELETE FROM user_rewards WHERE user_id IN (SELECT id FROM users
  WHERE email IN ('curio-fe-verify@example.com','curio-fe-probe@example.com'));

DELETE FROM users
 WHERE email IN ('curio-fe-verify@example.com', 'curio-fe-probe@example.com');
```

**시연 전에는 토큰을 새로 시드하는 편이 안전하다.** 열한 개는 리허설 두 번이면 사라지는
양이고, 한 번 쓴 토큰은 되돌리기 전까지 다시 못 쓴다.

---

### 4-9. 실서버 검증 결과 (2026-08-20)

목이 아니라 실제 서버에 붙여 확인한 것들. 스펙과 다른 곳은 없었다.

| 확인 대상 | 결과 |
|---|---|
| `POST /auth/signup` | `201` + `UserResponse`. **토큰 없음** — 로그인을 이어 불러야 한다 |
| `POST /auth/login` | `{accessToken, user, expiresInSeconds}`. JWT 유효기간 실측 86,400초 |
| `POST /cards/registrations` | **`201`** (200 아님) + `CardResponse`. 타입과 완전히 일치 |
| `GET /cards` | `CardResponse[]`. `product` 는 `ProductSummary` — 브랜드도 상세도 없음, 예상대로 |
| `GET /products/{id}` | 브랜드·소재·케어까지 전부. 인증 불필요 |
| `GET /product-collections/{id}/products` | `{product, required, displayOrder}[]` |
| `GET /rewards/progress` | 카드 10장 등록 후 달성률이 정확히 반영됨 (Seoul Exclusive 3/3 = 100%) |
| `GET /rewards/my` | 해금된 것만. `claimCode` 는 `null` |
| `POST /rewards/{id}/claim` | `claimCode: "CLAIM-002DA189"` 발급. **status 는 `UNLOCKED` 그대로** — 매장 직원 도메인이 없어 `CLAIMED` 로 바뀌지 않는다 |
| `/images/**` | 토큰 있으면 200, 없으면 401 |

퍼센트→장수 환산도 실데이터로 맞았다: Seoul Exclusive 는 필수 상품 3개이고 이벤트 조건이
66.67% 이므로 `ceil(0.6667 × 3) = 2장`, 화면에는 "앞으로 2장"으로 나온다.

---

## 5. 단계 계획 — 1~4단계 구현 완료 (2026-08-20)

각 단계는 **끝났는지 확인할 수 있는 기준**을 갖는다. 1~4단계는 구현했고 `tsc --noEmit` 과
웹 익스포트로 확인했다. 5단계는 필드명 수정만 반영했고 커스텀 화면은 남아 있다.

### 1단계 — 전송 계층 (다른 모든 단계의 전제)

1. `.env` 에 `EXPO_PUBLIC_API_URL=http://1.201.117.14/api/v1`. 기본값 `localhost:8080` 은 유지
   (로컬 백엔드를 띄우는 사람이 있을 수 있다).
2. `client.ts` — 401 을 잡아 세션을 끊는 훅, `assetUrl()`(상대경로 → 절대 URL) 추가.
3. `app.json` 에 ATS/cleartext 예외 (4-2).
4. `USE_MOCK` 3개(`auth-store` `cards-store` `issue-flow`)를 파일 상수에서
   **`EXPO_PUBLIC_USE_MOCK` 하나로 통일**한다. 지금은 세 군데를 따로 켜야 하고, 그러면 반드시
   하나를 빠뜨린다.

> 확인: `EXPO_PUBLIC_USE_MOCK=false` 로 앱을 켰을 때 로그인 화면까지 뜬다.

### 2단계 — 인증 (이게 되어야 나머지가 인증 헤더를 갖는다)

1. `AuthUser` → `{id, email, name, role}`. `nickname` 제거.
2. `signup()` 반환 타입 `UserResponse` 로 수정 + **가입 성공 시 곧바로 `login()` 이어 호출**.
   회원가입 화면은 이미 이메일·비밀번호를 들고 있으므로 화면 변경이 없다.
   `nickname` 은 주소에서 뽑아 `name` 으로 보낸다 (AGENTS.md 의 기존 결정 그대로).
3. `expiresInSeconds` → 만료 시각 저장. 복원 시 만료면 `signed-out`.
4. `signOut` 은 토큰 폐기만 (백엔드에 로그아웃 엔드포인트가 없다).
5. `withdraw()` 는 호출 형태 그대로 둔다 — `DELETE /auth/me` 는 204 를 준다. **다만 서버가
   실제로 탈퇴시키지 않는다** (§4-6). 프론트가 할 수 있는 일은 없고, 로컬 세션을 끊는
   현재 동작이 그 상황에서 할 수 있는 최선이다.

> 확인: 새 계정 가입 → 앱 재시작해도 로그인 유지 → 탈퇴하면 문으로 돌아온다.

### 3단계 — 카드 (컬렉션 + 상세가 여기서 실데이터가 된다)

1. `api/cards.ts` 신설 — `fetchCards()`, `fetchCard(id)`.
2. `api/products.ts` 신설 — `fetchProduct(id)`, 상품 단위 메모 캐시.
3. `toCard()` 를 `hydrateCard()` 로 확장: `CardResponse` + `ProductResponse` → `Card`.
   시리얼 접두사 브랜드 추측 제거, `brand = { id: brandId, name: brandName, accent: colors.solid,
   logoUrl: null }`. **로고가 없으면 이름을 타이포로 서명하는 것이 이미 지원되는 상태**이므로
   카드 앞면은 손대지 않는다.
4. `cards-store` 가 목 대신 이걸 부른다.
5. `labels.ts` 로 카테고리·시즌·테마 코드 한국어화 (3-5).
6. 발급 에러코드 확장 (3-4).

> 확인: 내 컬렉션에 실제 카드가 뜨고, 카드 상세의 시트가 소재·케어·컬렉션을 실데이터로 채운다.
> 보증 행은 시드가 비어 있어 안 보이는 게 정상이다.

### 4단계 — 리워드 (목데이터를 통째로 교체)

1. `api/rewards.ts` — `fetchProgress()`, `fetchMyRewards()`, `claimReward(userRewardId)`.
2. 두 리스트 조인 + 브랜드 역참조를 `lib/rewards.ts` 한 곳에 (화면은 `Reward[]` 만 본다).
3. `Reward` 타입 수정: `note`·`claimedStore` 제거, `kind` 2분기, 진행률을 퍼센트 기반으로.
4. `/reward/[id]` 의 코드 표시를 **`claim` 호출 결과**로 바꾼다. 코드는 버튼을 눌러야 생긴다.

> 확인: 카드를 1장 등록하면 리워드 화면의 진행률이 그만큼 오른다.

### 5단계 — AI 리소스 / 커스텀 (마지막, 여기만 미지수가 남는다)

1. `ai-resources.ts` 필드명 3개 수정, batch 로 전환, `PRODUCT_ANGLE` 제외 (3-2).
2. `issue-flow` 는 구조를 그대로 둔다 — 폴링 설계가 계약과 맞다 (202 + PENDING, 푸시 없음).
3. `GET /card-templates` 가 생겼으므로 `/card/[id]/edit` 의 블로커가 풀렸다. 다만
   **템플릿 3종의 `allowedCardType` 이 전부 null** 이라 어떤 카드에 무엇을 붙일 수 있는지
   판단할 근거가 없다. 실제 생성 시간·성공률도 미지수다. → **연동 마지막**, 시간이 남을 때만.

---

## 6. 백엔드에 요청할 것 (우선순위)

1. **CORS 허용** — `SecurityConfig` 에 `.cors()` + `CorsConfigurationSource`. 없으면 웹이 통째로 막힌다.
2. **`/images/**` permitAll** — 지금은 401이라 상품/템플릿 이미지가 안 뜬다. 웹은 헤더로 우회할 방법도 없다.
3. **`CardResponse.product` 에 `brandId`/`brandName`** — 넣어주면 카드마다 상품을 한 번 더 부르는 hydrate 가 사라진다. `ProductResponse` 에 이미 있으니 `ProductSummary` 매핑만 늘리면 된다.
4. **시드 채우기** — `productCode` `origin` `warrantyInfo` `warrantyMonths` 가 전부 null 이라 카드 뒷면 보증 2줄과 시트의 제품 번호가 빈다.
5. **`UnlockTarget` 에 `rewardType`** — 없으면 리워드 CTA 를 `혜택 사용하기` 하나로 뭉뚱그려야 한다.
6. **`RewardProgressResponse` 에 `brandId`/`brandName`** — 브랜드 그룹핑을 위해 `/product-collections` 를 따로 부르지 않아도 된다.
7. **OAuth 리다이렉트에 `curio://oauth/callback` 허용** — 네이티브에서 소셜 로그인을 붙일 때 필요.
8. **시드 계정 비밀번호** — `customer@example.com` 의 `password_hash` 가 NULL 이라 로그인 불가.
9. **탈퇴 반영** — `AuthService.login()` 에 `deleted_at IS NULL`. 지금은 로그인만 통과하고 그 토큰은 전부 401 이라, 앱에서 로그인↔로그아웃 무한 반복으로 보인다 (§4-6).
10. **HTTPS** — 비밀번호가 평문으로 전송된다 (§4-7). iOS ATS 예외(§4-2)도 같이 해결된다.
11. **데모 QR 토큰 재시드 + 확인용 계정 정리** — 열한 개가 모두 소진됐다. 복구 SQL 은 §4-8 (최우선: 시연 전에 필요하다).

1·2번은 성격이 다르다. 나머지는 "있으면 더 좋은 것"이고 **1·2번은 없으면 웹에서 아무것도 안 된다.**

---

## 7. 범위 밖으로 남기는 것

- **사용자 컬렉션 폴더** (`GET/POST /collections`) — API 는 생겼지만 화면 근거가 없다. 내 컬렉션의
  드롭다운은 카드에서 파생한 필터이고(`collection-filters.ts`), 그게 화면 하나로 끝나는 데 비해
  폴더는 만들기·이름짓기·담기·빼기 네 화면을 새로 요구한다. **API 가 생겼다는 것이 화면을
  만들 이유는 아니다.**
- **`price`** — 받지만 쓰지 않는다 (§2).
- **실물 카드** — 시드 리워드 `Seoul Collector Pass` 가 `PHYSICAL_CARD` 인데, 실물 카드는
  2026-08-19 에 범위에서 빠졌다. 화면에는 뜨지만 수령 경로가 없다. 시드 교체를 제안하되
  강하게 요구하진 않는다 — `kind` 분기가 이미 흡수한다.
- **매장 수령 확정** — 직원 도메인이 없어 `CLAIMED` 전환 API 자체가 없다 (백엔드 운영 정책 문서).
  코드 발급까지가 끝이다.
