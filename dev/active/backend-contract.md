# 백엔드 계약 — 지금 API가 무엇인가

기준: `greenbee02/LIKELION-Hackathon-BackEnd` @ `9188d7d` (2026-08-20 21:14 KST) · 마이그레이션 V1~V12
확인: `http://1.201.117.14` · Base `/api/v1` · OpenAPI `http://1.201.117.14/v3/api-docs`
갱신일: 2026-08-20

> **실서버가 저장소보다 뒤에 있다 — 이 문서에서 처음 벌어진 일이다.** 배포된 빌드는
> `c99def4`(06:18Z) 이상 `b5f9690`(06:42Z) 미만이다: 새 정적 이미지는 서빙되는데
> (`/images/templates/common_back_black_info.png` 200, 이름을 고치기 전의 `…blank…` 은 404)
> `/v3/api-docs` 에 새 엔드포인트 둘이 없다. 정적 리소스는 jar 에 구워지므로 이 두 사실이
> 배포 시점을 24분 폭으로 좁힌다.
>
> 그래서 아래 표는 엔드포인트마다 **어디에 있는지**를 적는다 — 🟢 실서버 실측 · 🟡 저장소에만.
> 표시가 없는 절은 전부 🟢 다.

> **이 문서에는 계획이 없다.** 지금 서버가 무엇을 받고 무엇을 돌려주는지만 적는다. 막힌 것과
> 백엔드에 요청할 것은 `backend-open-items.md`, 컬럼 수준의 사실은 `db-schema-draft.md`.
>
> 이 셋으로 나눈 이유가 있다. 앞선 문서(`backend-integration-plan.md`)는 계약과 할 일과
> 변경 기록을 한 파일에 담고 있었고, 할 일이 끝나도 계약 쪽이 낡았는지 알 방법이 없었다.
> V8·V9 가 AI 리소스 응답 모양을 통째로 바꿨을 때 프론트가 그것을 모른 채 계속 돌아간 것이
> 그 결과다. **계약은 언제든 다시 훑어 통째로 갈아끼울 수 있어야 하고, 그러려면 계약만
> 들어 있어야 한다.**
>
> 표에 적힌 필드 이름은 DTO record 의 **선언 순서 그대로**다. DB 컬럼명과 다른 곳은 그때마다
> 적어둔다.

---

## 0. 공통

| 항목 | 값 |
|---|---|
| 성공 | `{"data": …}` — `ApiResponse<T>` 한 겹 |
| 실패 | `{"code": "...", "message": "..."}` |
| 인증 | `Authorization: Bearer {accessToken}` |
| 토큰 수명 | 24시간 (`JWT_EXPIRATION_MS` 기본 86400000) · **리프레시 토큰 없음** |
| 401 | 인증 실패 전부. `HttpStatusEntryPoint` 가 본문 없이 401만 준다 |

**인증 없이 부를 수 있는 경로** (`SecurityConfig` permitAll, 실측 확인):

```
/api/v1/auth/signup   /api/v1/auth/login   /api/v1/auth/oauth/exchange
/api/v1/products/**   /api/v1/product-collections/**   /api/v1/card-templates
/images/**            /generated/ai-resources/**
/oauth2/**  /login/**  /swagger-ui**  /v3/api-docs/**  /h2-console/**  /error
```

**`/images/**` 는 이제 공개다.** 실서버에서 토큰 없이 `200 image/png` 를 확인했다. 프론트의
`authorized()` · `useProtectedImage()` 는 더 이상 필요 없다 (`src/lib/card-art.ts`).

**CORS 는 이제 존재한다.** `Access-Control-Allow-Origin` 을 오리진별로 돌려준다. 다만 허용
목록이 `CORS_ALLOWED_ORIGINS` 환경변수이고 실서버는 기본값(`localhost:3000,localhost:8081`)
그대로다 — Vercel 오리진은 **403**. `backend-open-items.md` §4.

---

## 1. auth — `/api/v1/auth`

| Method | Path | 인증 | 성공 |
|---|---|---|---|
| POST | `/signup` | ✗ | 200 |
| POST | `/login` | ✗ | 200 |
| POST | `/oauth/exchange` | ✗ | 200 |
| GET | `/me` | ✓ | 200 |
| DELETE | `/me` | ✓ | 200 (소프트 탈퇴) |

```
SignupRequest  { email, password, name }
LoginRequest   { email, password }
OAuthCodeExchangeRequest { code }

AuthResponse   { accessToken, user: UserResponse, expiresInSeconds }
UserResponse   { id, email, name, role }        // role 은 UserRole enum
```

오류: `EMAIL_ALREADY_EXISTS` · `INVALID_CREDENTIALS` · `OAUTH_LOGIN_FAILED` · `INVALID_REQUEST`

소셜: `GET /oauth2/authorization/{google|kakao}` → 백엔드가 `FRONTEND_URL` 의
`/oauth/callback?code=…` 로 리다이렉트 → `POST /auth/oauth/exchange` 로 JWT 교환.
카카오도 설정돼 있다 (`application-oauth.yml`) — 프론트는 구글만 붙였고 애플은 백엔드에 없다.

---

## 2. card — `/api/v1/cards`

| Method | Path | 인증 | 성공 | 어디에 |
|---|---|---|---|---|
| POST | `/registrations` | ✓ | 201 | 🟢 |
| GET | `/cards` | ✓ | 200 | 🟢 |
| GET | `/cards/{cardId}` | ✓ | 200 | 🟢 |
| GET | `/{cardId}/customization-options` | ✓ | 200 | 🟡 |
| POST | `/{cardId}/customizations` | ✓ | 202 | 🟢 |
| POST | `/{cardId}/customizations/layers` | ✓ | 201 | 🟡 |
| GET | `/{cardId}/customizations` | ✓ | 200 | 🟢 |
| POST | `/{cardId}/customizations/{customizationId}/select` | ✓ | 200 | 🟢 |
| POST | `/{cardId}/restore-original` | ✓ | 200 | 🟢 |

### CardResponse

```
CardResponse {
  id, originalCardType, cardType, status,
  purchaseDate, issuedAt, serialNumber,
  product: ProductSummary,
  store:   StoreSummary,
  template: TemplateSummary,
  selectedCustomization: CustomizationSummary
}

ProductSummary        { id, name, offeringType, category, imageUrl, limited }
StoreSummary          { id, name, country, city }
TemplateSummary       { id, name, frontImageUrl, backImageUrl, allowedCardType }
CustomizationSummary  { id, status, generatedFrontImageUrl, generatedBackImageUrl,
                        generatedMessage, createdAt }
```

**`brand` 는 여전히 없다.** `ProductSummary` 에 `brandId`/`brandName` 조차 없으므로, 카드
하나의 브랜드를 알려면 `GET /products/{id}` 를 한 번 더 불러야 한다 — 프론트의 `hydrateCard()`
가 그것이다. `brands.logo_url` 은 스키마에 있지만 **어느 DTO 에도 노출되지 않는다** (저장소
전체 grep 결과 `Brand.java` 엔티티에만 존재).

**`CustomizationSummary` 에는 레이어가 없다** — `b5f9690` 이후에도 그대로다. 레이어로 꾸민
카드는 여기서 `generatedFrontImageUrl: null` 로만 보이므로, `GET /cards` 하나로는 꾸민 얼굴을
그릴 수 없다. `GET /{cardId}/customizations` 를 카드마다 한 번 더 부르는 수밖에 없다
(`backend-open-items.md` §2).

### 발급 오류 — 9개 그대로

| 코드 | HTTP |
|---|---|
| `QR_TOKEN_INVALID` | 404 |
| `QR_ALREADY_USED` | 409 |
| `QR_EXPIRED` | 409 |
| `CARD_TEMPLATE_NOT_FOUND` | 409 |
| `TEMPLATE_INACTIVE` | 409 |
| `TEMPLATE_CARD_TYPE_NOT_ALLOWED` | 409 |
| `TEMPLATE_BRAND_MISMATCH` | 409 |
| `PRODUCT_INACTIVE` | 409 |
| `TEMPLATE_NOT_FOUND` | 404 |

### 🆕 `GET /api/v1/purchase-qrs/preview?qrToken=…`

**인증 필요** (permitAll 목록에 없다 — 실측 401). QR 을 태우지 않고 무엇이 발급될지 미리 본다.

```
PurchaseQrPreviewResponse {
  status, usable, purchaseDate, serialNumber, expiresAt,
  product: { id, productCode, name, imageUrl, limited },
  store:   { id, name, country, city }
}
```

프론트는 이 엔드포인트를 **쓰고 있지 않다.** 지금 스캔 화면은 읽은 값을 그대로
`/issue/[token]` 으로 넘기고 거기서 바로 발급을 시도하므로, 실패든 성공이든 되돌릴 수 없다.
`usable` 을 먼저 물으면 "쓸 수 없는 코드"를 토큰을 태우지 않고 가려낼 수 있다.

### 커스터마이징 (1) — AI 경로 🟢

```
CustomizationCreateRequest { templateId, inputImageUrl, inputText }
CardCustomizationResponse  { id, cardId, templateId, inputImageUrl, inputText,
                             generatedFrontImageUrl, generatedBackImageUrl,
                             generatedMessage, customizationData, aiModel, status,
                             frontLayers[], back, createdAt }
```

`frontLayers` 와 `back` 은 저장소에만 있다 (🟡) — 실서버의 `CardCustomizationResponse` 는
`status` 다음이 바로 `createdAt` 이다. 아래 (2) 로 만든 커스텀을 이 목록으로 읽을 때만 채워진다.

오류: `CUSTOMIZATION_NOT_FOUND` (404) · `CUSTOMIZATION_NOT_COMPLETED` (409) ·
`CARD_NOT_ACTIVE` (409)

### 커스터마이징 (2) — 승인 에셋 레이어 경로 🟡 **새로 생겼다**

`b5f9690` (2026-08-20 15:42 KST). **AI 가 아니고, 비동기도 아니다.** 브랜드가 승인해 DB 에
넣어둔 정적 PNG 세 겹을 고객이 고르면 그 선택을 그대로 저장한다 — 202 도 폴링도 없고,
`POST` 한 번이 201 로 끝나며 **저장과 동시에 그 커스텀이 선택되어 카드가 `CUSTOMIZE` 가 된다**
(`card.selectCustomization(saved)`). `generationStatus` 는 처음부터 `COMPLETED`,
`aiModel` 은 `"approved-assets-v1"` 이라는 상수다.

**결과물은 이미지가 아니라 레이어 목록이다.** `generatedFrontImageUrl` 은 끝까지 `null` 로
남는다 — 앞면은 서버가 합성하지 않고 **클라이언트가 세 겹을 겹쳐 그린다.**

#### `GET /{cardId}/customization-options` — 고를 수 있는 것

카드 소유자만, `ACTIVE` 카드만.

```
CardCustomizationOptionsResponse {
  cardId, productId,
  front: {
    productBackgrounds: DesignAsset[],   // 이 카드 상품의 활성 PRODUCT_BACKGROUND
    borders:            DesignAsset[]    // 같은 브랜드의 활성 BORDER
  },
  back: { layoutId, baseImageUrl, layoutData }
}

DesignAsset { id, assetKey, type, name, variantCode, imageUrl,
              transparent, width, height, metadata }
```

- `type` = `PRODUCT_BACKGROUND` · `BORDER` · `BACK_BASE`
- 시드(V11)는 상품 11개 × 배경 A/B/C = 33장, 테두리 3장, 공통 뒷면 1장. 전부 1024×1536.
- 경로는 `/images/templates/prod_005_A.png` · `border_01.png` ·
  `common_back_black_info.png` 꼴이고 **셋 다 실서버에서 이미 200 으로 뜬다.**
- `metadata.recommendedZIndex` 는 배경 10, 테두리 20. 문구는 요청이 정한다.
- 오류: `CARD_NOT_FOUND` (404) · `CARD_NOT_ACTIVE` (409) · `CARD_BACK_LAYOUT_NOT_FOUND` (409)

`back.layoutData` 는 뒷면 **글자를 어디에 찍을지**를 좌표로 준다. 이미지에 글자가 구워져 있지
않다는 뜻이다:

```
layoutData {
  version: 1, coordinateSystem: "NORMALIZED",
  canvas: { width: 1024, height: 1536 },
  safeArea:   { left, right, top, bottom },
  labelStyle: { fontFamily, fontSize, fontWeight, letterSpacing, color, textAlign },
  valueStyle: { fontFamily, fontSize, fontWeight, lineHeight, color, textAlign },
  fields: [ { key, label, source, format?, labelX, valueX, y, width, maxLines } ]
}
```

`fields` 다섯: `STORE`(`store.name`) · `DATE`(`purchaseDate`, `yyyy.MM.dd`) ·
`LOCATION`(`store.city,store.country` → `{city}, {country}`) · `PRODUCT`(`product.name`) ·
`SERIAL_NUMBER`(`serialNumber`). **값의 출처는 `CardResponse` 자신이다.**
`labelStyle.color` 는 `#B8AA99`, `valueStyle.color` 는 `#D8CEC1`, 폰트는 `Pretendard`.

#### `POST /{cardId}/customizations/layers` — 고른 것을 저장

```
LayeredCustomizationCreateRequest {
  productBackgroundAssetId, borderAssetId, backLayoutId,   // 전부 UUID, 전부 필수
  text: { content,                    // NotBlank, 저장 시 trim
          x, y,                       // 0~1
          width, height,              // 0 초과 1 이하
          rotation,                   // -360~360
          opacity,                    // 0~1
          zIndex,                     // 0 이상 정수
          style }                     // 자유 JSON 객체, 생략 가능
}
```

```
LayeredCustomizationResponse {
  id, cardId, status,                 // status 는 항상 "COMPLETED"
  frontLayers: [ { type, assetId, imageUrl, textContent, layerOrder,
                   x, y, width, height, rotation, opacity, zIndex, styleData } ],
  back: { layoutId, baseImageUrl, layoutData, contentData },
  createdAt
}
```

- `frontLayers` 는 항상 세 줄이고 순서가 정해져 있다: `PRODUCT_BACKGROUND`(order 0, z 10) →
  `BORDER`(order 1, z 20) → `TEXT`(order 2, z 는 요청값). DB 가 `(customization_id, layer_type)`
  과 `(customization_id, layer_order)` 에 UNIQUE 를 걸어 **한 커스텀에 같은 종류는 한 겹뿐**이다.
- **배경과 테두리는 옮길 수 없다.** 요청이 좌표를 받지 않고, 서버가 `(0, 0, 1, 1)` · 회전 0 ·
  불투명도 1 로 굳혀 저장한다 (`CardCustomizationLayer.base`). 고객이 배치하는 것은 문구
  하나뿐이고, 나머지 둘은 **고르기만 한다.**
- 이미지 레이어는 `textContent` 가 `null`, 문구 레이어는 `assetId`·`imageUrl` 이 `null`.
- `back.contentData` 는 **발급 당시 표시값의 스냅샷**이다 —
  `{ store, date, location, product, serialNumber }`. 나중에 상점 이름이 바뀌어도 카드에 적힌
  것은 그날의 값으로 남는다. 날짜는 서버가 `yyyy.MM.dd` 로, **UTC 기준**으로 굳혀서 준다.
- 요청의 `style` 은 검증 없이 그대로 되돌아온다 (`styleData`). 계약이 정한 키는 없다 —
  백엔드 예시가 `{ "fontFamily": "SERIF", "color": "#E8DFD2" }` 를 쓴다.

오류 — 전부 새 코드다:

| 코드 | HTTP | 언제 |
|---|---|---|
| `CARD_NOT_FOUND` | 404 | 내 카드가 아니거나 없다 |
| `CARD_NOT_ACTIVE` | 409 | `ACTIVE` 가 아닌 카드 |
| `CARD_DESIGN_ASSET_NOT_FOUND` | 404 | 배경·테두리 id 가 없다 |
| `CARD_DESIGN_ASSET_INACTIVE` | 409 | 비활성 에셋 |
| `CARD_DESIGN_ASSET_TYPE_MISMATCH` | 400 | 배경 자리에 테두리를 넣는 등 |
| `CARD_DESIGN_ASSET_PRODUCT_MISMATCH` | 409 | 다른 상품의 배경 |
| `CARD_DESIGN_ASSET_BRAND_MISMATCH` | 409 | 다른 브랜드의 에셋 |
| `CARD_BACK_LAYOUT_NOT_FOUND` | 404 | 레이아웃 id 가 없다 |
| `CARD_BACK_LAYOUT_INACTIVE` | 409 | 비활성 레이아웃, 또는 베이스 에셋이 비활성 |
| `CARD_BACK_LAYOUT_BRAND_MISMATCH` | 409 | 다른 브랜드의 레이아웃 |
| `CARD_BACK_LAYOUT_INVALID` | 409 | 베이스 에셋이 `BACK_BASE` 가 아니다 |
| `CARD_CUSTOMIZATION_DATA_INVALID` | 400 | `style` 을 JSON 으로 못 쓴다 |

---

## 3. AI 리소스 — `/api/v1/cards/{cardId}/ai-resources` 🔴 **V8·V9 로 모양이 바뀌었다**

| Method | Path | 성공 | 응답 타입 |
|---|---|---|---|
| POST | `` (단건) | 202 | `AiResourceGenerationBatchResponse` |
| POST | `/batch` | 202 | `AiResourceGenerationBatchResponse` |
| GET | `` | 200 | `AiResourceGenerationBatchResponse` |
| GET | `/{resourceId}` | 200 | `AiResourceGenerationResponse` (단건, 평평함) |
| POST | `/compose` | 201 | `AiResourceCompositionResponse` |

### 응답이 그룹으로 감싸진다 — 평평한 배열이 아니다

```
AiResourceGenerationBatchResponse {
  cardId,
  groups: [ AiResourceCandidateGroupResponse ]
}

AiResourceCandidateGroupResponse {
  candidateGroupId,        // UUID
  resourceType,            // String
  candidateCount,          // int
  candidates: [ AiResourceGenerationResponse ]   // candidateIndex 오름차순 정렬됨
}

AiResourceGenerationResponse {
  id, candidateGroupId, candidateIndex, candidateCount,
  cardId, productId, templateId,
  resourceType, prompt, sourceImageUrl,
  generatedImageUrl, generatedData, aiModel,
  status, failureReason, createdAt, updatedAt
}
```

**후보 그룹이 서버 개념이 됐다.** 프론트가 "어느 넷이 한 배치인가"를 요청 id 로 기억하고,
기억이 없으면 `createdAt` 으로 뭉치던 장치(`src/lib/card-design.ts` 의 `batches` ref 와
`clusterLatest`)는 이제 서버가 하는 일이다. `candidateIndex` 가 있으므로 격자 순서도 안정된다.

### 후보를 만드는 법 — 단건이 그룹 하나를 만든다

```
AiResourceGenerationRequest {
  resourceType,      // 필수
  templateId,        // 선택
  prompt,            // 선택, 최대 2000자
  options,           // 선택, Map
  candidateCount     // 선택, 3 이상 4 이하. 생략하면 4
}
```

- `POST /ai-resources` 한 번이 `candidateGroupId` 하나에 **`candidateCount` 개 행**을 만든다.
- `POST /ai-resources/batch` 는 `{resources: [...]}` 를 받고 (1~8개), **항목마다 그룹을 따로**
  만든다. 즉 3종류를 보내면 3그룹 × 4후보 = **12행**이 생긴다.
- **같은 `resourceType` 을 한 배치에 두 번 넣으면 `AI_RESOURCE_TYPE_DUPLICATED` (400).**
  같은 종류 후보 4개를 `/batch` 에 네 번 실어 보내는 방식은 이제 거부된다.
- 서버가 `options` 에 `_regionalVariant`(0-based) · `_candidateIndex`(1-based) ·
  `_candidateCount` 를 얹어 후보마다 다른 결과가 나오게 한다.

### 상태 — `PROCESSING` 이 생겼다

```
PENDING → PROCESSING → COMPLETED | FAILED | REJECTED | ARCHIVED
```

V9 가 `PROCESSING` 을 CHECK 제약에 추가했다. 여섯 값 전부 응답에 올 수 있다.

### 워커 (`application.yml` 기본값)

| 속성 | 기본 | 뜻 |
|---|---|---|
| `AI_WORKER_FIXED_DELAY_MS` | 5000 | 5초마다 한 건 집어간다 |
| `AI_WORKER_MAX_ATTEMPTS` | 3 | 실패 시 최대 3회 |
| `AI_WORKER_RETRY_DELAY_MS` | 10000 | 재시도 간격 10초 |
| `AI_WORKER_STALE_TIMEOUT_MS` | 900000 | 15분 넘게 `PROCESSING` 이면 회수 |
| `AI_ENABLED` | **false** | 꺼져 있으면 워커가 아무것도 안 집는다 — 전부 `PENDING` 으로 남는다 |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2` | 이미지 |
| `OPENAI_TEXT_MODEL` | `gpt-5-mini` | `generatedData` 쪽 |
| `OPENAI_IMAGE_SIZE` | `1024x1536` | 2:3. 카드는 3:4 라 `CardAspectRatioImageNormalizer` 가 맞춘다 |

한 후보의 최악 소요는 대략 `5s(집기) + 생성시간 + 재시도 2회 × 10s`. 프론트의 인내 시간은
이 값들에 맞춰야 한다.

**생성물 주소는 `/generated/ai-resources/**` 이고 공개다** (`AI_STORAGE_PUBLIC_BASE_URL`).

### 오류

| 코드 | HTTP | 언제 |
|---|---|---|
| `AI_RESOURCE_TYPE_DUPLICATED` | 400 | 한 배치에 같은 종류 두 번 |
| `AI_RESOURCE_TYPE_UNSUPPORTED` | 400 | **`PRODUCT_ANGLE` 은 폐지됐다** |
| `PRODUCT_IMAGE_REQUIRED` | 409 | `BACKGROUND` 인데 상품 이미지가 없다 |
| `CARD_NOT_ACTIVE` | 409 | `ACTIVE` 아닌 카드 |
| `CARD_NOT_FOUND` | 404 | |
| `AI_RESOURCE_NOT_FOUND` | 404 | 단건 조회 |
| `AI_RESOURCE_OPTIONS_INVALID` | 400 | `options` 직렬화 실패 |
| `TEMPLATE_*` 4종 | 404/409 | `templateId` 를 넘겼을 때 |

`BACKGROUND` 는 서버가 상품 이미지를 `sourceImageUrl` 로 자동으로 넣는다 — 프론트가 보낼
필요가 없고, 상품 이미지가 없는 카드는 아예 거부된다.

### compose

```
AiResourceCompositionRequest { resourceIds, message, layoutData, layers }
AiResourceCompositionResponse { card: CardResponse, customization: CardCustomizationResponse }

CardLayerRequest { id, type, slot, resourceId,
                   x, y, width, height, rotation, opacity,
                   zIndex, visible, locked, text, styleData }
```

`CardLayerType` = `BASE_CARD` `BACKGROUND` `PRODUCT` `BORDER` `PATTERN` `DECORATION` `TEXT` `FINISH`

레이어와 리소스의 호환 규칙 (`isCompatible`):

| 레이어 | 받을 수 있는 리소스 |
|---|---|
| `BACKGROUND` `BORDER` `PATTERN` `DECORATION` | 같은 이름의 리소스만 |
| `FINISH` | 아무거나 |
| `PRODUCT` | 리소스 불가 — 상품 기본 이미지를 쓴다 (`resourceId` 없으면 오류) |
| `TEXT` | 리소스 불가 — 문구만 |
| `BASE_CARD` | **폐지** — `CARD_BASE_LAYER_DEPRECATED` (400) |

오류: `CARD_BASE_LAYER_DEPRECATED` · `CARD_LAYER_DUPLICATED` · `CARD_LAYER_SIZE_INVALID` ·
`CARD_LAYER_RESOURCE_REQUIRED` · `CARD_LAYER_RESOURCE_NOT_SELECTED` ·
`CARD_LAYER_RESOURCE_TYPE_MISMATCH` · `CARD_TEXT_LAYER_INVALID` · `PRODUCT_IMAGE_NOT_FOUND` ·
`AI_RESOURCE_DUPLICATED` · `AI_RESOURCE_CANDIDATE_DUPLICATED` · `AI_RESOURCE_NOT_COMPLETED` ·
`AI_COMPOSITION_INVALID` — 전부 400, `CARD_NOT_ACTIVE` 만 409

---

## 4. catalog — `/api/v1` (전부 인증 불필요)

| Method | Path |
|---|---|
| GET | `/products` · `/products/{productId}` |
| GET | `/product-collections` · `/{collectionId}` · `/{collectionId}/products` |
| GET | `/card-templates` |

```
ProductResponse { id, brandId, brandName, productCode, name, offeringType, category,
                  theme, productionYear, season, region, material, color, origin,
                  description, imageUrl, warrantyInfo, warrantyMonths, careInfo,
                  experienceLocation, availableFrom, availableUntil, price, limited }

ProductCollectionResponse { id, brandId, brandName, name, description, theme,
                            productionYear, season, region, limited, coverImageUrl }

CollectionItemResponse { product: ProductResponse, required, displayOrder }

CardTemplateResponse { id, brandId, brandName, name, description,
                       frontImageUrl, backImageUrl, allowedCardType, resourceData }
```

`resourceData` 는 **JSON 문자열 한 덩어리**다. 파싱은 `src/lib/api/card-templates.ts` 한 곳에서만.

🟡 **V11·V12 가 이 둘을 바꾼다 — 실서버는 아직 옛 값이다.**

- V11 이 세 템플릿의 `resourceData` 에 `basicRenderMode: "FIXED_IMAGE_PAIR"` 와
  `customization: { frontRenderMode: "THREE_LAYER", frontLayerOrder: [PRODUCT_BACKGROUND,
  BORDER, TEXT], backRenderMode: "COMMON_LAYOUT", backLayoutId }` 를 덧붙인다. 즉 **기본
  카드는 앞뒤 이미지 한 쌍 그대로, 꾸민 카드만 세 겹**이라는 구분이 데이터로 온다.
- V12 가 세 템플릿의 `backImageUrl` 을 전부 `/images/templates/common_back_black_info.png`
  하나로 모은다. 뒷면이 템플릿마다 다르던 것이 브랜드 공통 한 장이 된다는 뜻이고,
  **이미 발급된 카드도 템플릿을 참조하므로 함께 바뀐다.** 실측(2026-08-20)으로는 셋 다
  아직 `template_00X_back.png` 다.

오류: `PRODUCT_NOT_FOUND` (404)

---

## 5. 사용자 컬렉션 — `/api/v1/collections` (인증 필요)

| Method | Path |
|---|---|
| POST | `` |
| GET | `` · `/{id}` |
| PATCH | `/{id}` |
| DELETE | `/{id}` |
| POST | `/{id}/cards` (body `{cardId}`) |
| DELETE | `/{id}/cards/{cardId}` |

```
CollectionCreateRequest { name, description, coverImageUrl }
CollectionUpdateRequest { name, description, coverImageUrl }
CollectionCardAddRequest { cardId }

UserCollectionResponse { id, name, description, coverImageUrl, collectionType,
                         createdAt, updatedAt, cardCount, cards: [CardResponse] }
```

**`collectionType` 은 생성 요청에 없다** — 서버가 정하므로 무엇으로 만들든 `CUSTOM` 이다.
응답이 `CardResponse[]` 를 통째로 실어 오지만, 프론트는 id 만 갖는다 — 카드 본문은
`useCards()` 가 이미 들고 있고, 다시 `hydrateCard()` 를 돌리면 상품 조회가 카드 수만큼 더 나간다.

오류: `COLLECTION_NOT_FOUND` (404) · `COLLECTION_CARD_NOT_OWNED` (404) ·
`COLLECTION_CARD_NOT_FOUND` (404) · `COLLECTION_CARD_ALREADY_ADDED` (409)

---

## 6. 리워드 — `/api/v1/rewards` (인증 필요)

| Method | Path |
|---|---|
| GET | `/progress` |
| GET | `/my` |
| POST | `/{id}/claim` |

```
RewardProgressResponse { collectionId, collectionName,
                         requiredProductCount, ownedRequiredProductCount,
                         percentage,                     // BigDecimal, 소수 2자리
                         targets: [UnlockTarget] }

UnlockTarget { type,                // "REWARD" | "EVENT"
               id, name,
               requiredPercentage,  // BigDecimal
               unlocked }           // percentage >= requiredPercentage

UserRewardResponse { id, targetType, targetId, name, status,
                     claimCode, unlockedAt, expiresAt }
```

**진행도는 카드 장수가 아니라 상품 종류로 센다.** 공식 컬렉션의 `required` 상품 id 집합과
고객이 가진 `ACTIVE` 카드의 상품 id 집합을 교집합해서 `owned/required × 100`, 소수 둘째 자리
반올림. 같은 상품의 카드를 두 장 가져도 1로 센다.

`rewardType`(`PHYSICAL_CARD`/`GOODS`/`EVENT_INVITATION`/`BENEFIT`)은 **여전히 노출되지 않는다.**
`UnlockTarget.type` 이 `REWARD`/`EVENT` 로만 갈리므로 프론트가 만들 수 있는 종류는 그 둘뿐이다.

---

## 7. 존재하지 않는 것

- **이벤트 컨트롤러 없음.** `events` 테이블은 있고 `UnlockTarget.type == "EVENT"` 로 이름만
  나오지만, 이벤트를 조회하거나 신청하는 엔드포인트는 없다.
- **케어·수선 엔드포인트 없음.**
- **`/api/v1/local/demo/reset` 은 `@Profile({"local","test"})`** — 실서버에 존재하지 않는다.
  소진된 데모 QR 을 앱에서 되살릴 방법은 없다.
- **레이어 커스터마이징 엔드포인트 둘은 실서버에 아직 없다** (§2 의 🟡). 저장소에는 있다.
