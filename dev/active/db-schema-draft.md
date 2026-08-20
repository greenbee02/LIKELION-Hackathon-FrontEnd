# DB 스키마 — 마이그레이션 기준

기준: `greenbee02/LIKELION-Hackathon-BackEnd` @ `a76ac03` · `src/main/resources/db/migration/` **V1 ~ V9**
갱신일: 2026-08-20

> **이 문서의 근거가 바뀌었다.** 이전 판은 백엔드 팀이 공유한 **MySQL 초안**을 그대로 옮긴
> 것이었고 "정확하지 않을 수 있다"는 단서가 붙어 있었다. 지금은 실제 저장소의 Flyway
> 마이그레이션 파일이 기준이고, 그 파일들이 배포된 DB 를 만든 것이므로 추측이 아니다.
>
> 초안과 실물의 가장 큰 차이는 **DBMS 자체**다 — 초안은 MySQL 8.0 문법이었지만 실제 스키마는
> **PostgreSQL** 이다 (`UUID`, `TIMESTAMP WITH TIME ZONE`, `JSONB`, `NUMERIC(5,2)`).
>
> **다만 여전히 컬럼이 있다는 것과 API 로 내려온다는 것은 다르다.** 프론트가 실제로 받을 수
> 있는 필드는 `dev/active/backend-contract.md` 가 기준이고, 그쪽이 이 문서보다 우선한다.
> 여기 있는데 DTO 에 없는 필드는 "요청하면 매핑만 추가하면 되는 것"이지 지금 쓸 수 있는 것이
> 아니다.

원문은 옮겨 적지 않는다. 저장소의 마이그레이션 파일이 원본이고, 사본은 반드시 낡는다.

| 파일 | 내용 |
|---|---|
| `V1__init.sql` | `users` `products` `cards` `card_customizations` — 최초 4개 테이블 |
| `V2__add_social_accounts.sql` | `social_accounts`, `users.password_hash` 를 NULL 허용으로 |
| `V3__add_user_withdrawal.sql` | `users.deleted_at` 한 컬럼 |
| `V4__expand_product_and_card_domain.sql` | `brands` `stores` `product_collections` `product_collection_items` `purchase_qrs` `card_templates` + `products`·`cards` 대폭 확장 |
| `V5__add_ai_resource_generations.sql` | `ai_resource_generations` |
| `V6__add_collection_reward_and_ai_domain.sql` | `collections` `collection_cards` `rewards` `events` `collection_rewards` `user_rewards` + AI 분석·추천 3종 |
| `V7__insert_demo_seed_data.sql` | 데모 시드 — 브랜드·매장·상품·컬렉션·QR·템플릿·리워드·이벤트 |
| `V8__add_ai_resource_candidate_groups.sql` | `ai_resource_generations` 에 후보 그룹 3컬럼 |
| `V9__add_ai_resource_worker_operability.sql` | 같은 표에 `PROCESSING` 상태와 워커용 3컬럼 |

---

## V8 — 후보 그룹 (2026-08-20)

`ai_resource_generations` 에 세 컬럼이 붙었다. 셋 다 NULL 허용이라 **기존 단건 이력은 그대로
호환된다** — 마이그레이션 주석이 그렇게 적어두었다.

| 컬럼 | 타입 | 뜻 |
|---|---|---|
| `candidate_group_id` | UUID | 한 번의 요청으로 만들어진 후보들을 묶는다 |
| `candidate_index` | INTEGER | 그룹 안에서 몇 번째인가. 1-based |
| `candidate_count` | INTEGER | 그룹의 크기 |

- 인덱스 `idx_ai_resource_generations_candidate_group (candidate_group_id)`
- CHECK `chk_ai_resource_generations_candidate_range` — `candidate_group_id` 가 NULL 이 아니면
  `candidate_index` 도 NOT NULL 이어야 하고, **`candidate_count` 는 3 또는 4**,
  `candidate_index` 는 1..`candidate_count`.

**이것이 프론트에서 뜻하는 것:** "어느 넷이 한 배치인가"를 프론트가 기억할 필요가 없어졌다.
`src/lib/card-design.ts` 가 요청 id 를 `useRef` 에 담고, 기억이 없으면 `createdAt` 으로 뭉치던
장치(`clusterLatest`)가 통째로 서버 기능이 됐다. `candidate_index` 덕에 격자 순서도 안정된다.

**그리고 후보 개수의 상한 3~4 는 이제 이 컬럼의 CHECK 다.** 예전에는 배치 배열 크기가 3~4 로
제한된 것을 이용해 같은 종류를 네 번 실어 보내 후보 넷을 흉내 냈는데, 그 방식은 지금
`AI_RESOURCE_TYPE_DUPLICATED` 로 거부된다.

---

## V9 — 워커 운용 (2026-08-20)

같은 표. 상태 CHECK 를 갈아끼우고 재시도용 컬럼 셋을 더한다.

```
DROP  chk_ai_resource_generations_status
ADD   CHECK (generation_status IN
        ('PENDING','PROCESSING','COMPLETED','FAILED','REJECTED','ARCHIVED'))
```

**`PROCESSING` 이 새로 생겼다.** 프론트의 `GenerationStatus` 유니온에 없던 값이고, 여섯 값
전부 응답에 올 수 있다.

| 컬럼 | 타입 | 뜻 |
|---|---|---|
| `processing_started_at` | TIMESTAMPTZ | 워커가 집어간 시각. 15분 넘으면 회수된다 |
| `attempt_count` | INTEGER NOT NULL DEFAULT 0 | 시도 횟수. 최대 3 |
| `next_attempt_at` | TIMESTAMPTZ | 재시도 예정 시각 |

- 인덱스 `(generation_status, next_attempt_at, created_at)` — 대기열
- 인덱스 `(generation_status, processing_started_at)` — 멈춘 작업 회수

**셋 다 DTO 에 없다.** 프론트가 읽을 수 있는 것은 `status` 뿐이므로, 재시도 중인 것과 처음
시도하는 것은 화면에서 구분되지 않는다 — 둘 다 `PENDING` 이거나 `PROCESSING` 이다. 다만 이
값들이 **얼마나 기다려야 하는가**를 정한다: 5초마다 한 건씩 집고, 실패하면 10초 뒤 최대 3회,
멈춘 것은 15분 뒤 회수. 프론트의 인내 시간은 이 숫자들에 맞춰야 한다.

---

## 프론트가 실제로 기대고 있는 것

마이그레이션에서 확인한 사실만 적는다.

| 스키마 사실 | 프론트에서의 뜻 |
|---|---|
| `rewards.reward_type` CHECK = `PHYSICAL_CARD` `GOODS` `EVENT_INVITATION` `BENEFIT` | 우리 `RewardKind` 3종이 근거를 갖는다. **다만 API 가 이 값을 안 내보내서** 지금 만들 수 있는 것은 `EVENT`·`BENEFIT` 둘뿐이다 |
| `user_rewards.status` CHECK = `UNLOCKED` `CLAIMED` `EXPIRED` `CANCELLED` | 네 번째 값 `CANCELLED` 가 있다. 우리는 목록에서 제외한다 — 만료로 보이면 이유가 틀리고, 잠긴 것으로 보이면 열리지 않을 것을 권하게 된다 |
| `user_rewards.claim_code` 가 UNIQUE 이고 해금 시점에 비어 있다 | 코드는 **수령 요청이 만든다.** 리워드 상세가 "코드를 보여주는 화면"이 아니라 "코드를 발급받는 화면"인 이유 |
| `collection_rewards.required_percentage` NUMERIC(5,2), `> 0 AND <= 100` | 해금 조건은 장수가 아니라 퍼센트다. 화면이 쓰는 장수는 `ceil(퍼센트 × 필수상품수)` 로 환산한 값 |
| 달성률은 **상품 종류**로 센다 | `OfficialCollectionProgressCalculator` — 필수 상품 id 집합 ∩ 보유 카드의 상품 id 집합. 같은 상품의 카드를 두 장 가져도 1이다 |
| `collection_rewards` 는 대상당 여러 행을 허용 | 한 리워드가 두 컬렉션에 걸릴 수 있어, 합칠 때 중복을 걸러야 한다 |
| `product_collection_items.is_required` | 달성률 분모는 컬렉션 전체가 아니라 필수 상품 수다 |
| **`brands.logo_url` 이 있다** | `Brand.logoUrl` 에 실제 출처가 있다는 뜻. **어느 DTO 도 내보내지 않는다** — 저장소 전체를 훑어도 `logoUrl` 은 `Brand.java` 엔티티에만 있다. 지금은 번들된 파일이 대신한다 |
| **브랜드 액센트 컬러 컬럼은 없다** | `Brand.accent` 는 계속 토큰이다. 하우스의 색을 데이터로 받는다는 설계는 아직 근거가 없다 |
| `cards` 에 `brand_id` 가 없다 | 브랜드는 `products.brand_id` 를 타고 유도된다. 그래서 카드를 상품으로 한 번 더 채운다 |
| `products.offering_type` CHECK 에 `ART` `GASTRONOMY` `TRAVEL` `EVENT` | 카드가 항상 물건인 것은 아니다. "상품"을 전제로 쓴 문구는 나중에 흔들릴 수 있다 |
| `card_templates.allowed_card_type` CHECK = `BASIC` `COLLECTOR` (NULL 허용) | `CUSTOMIZE` 는 여기 없다 — 카드의 상태이지 템플릿의 종류가 아니다. 시드는 세 템플릿 모두 NULL |
| `cards.status` 에는 CHECK 가 **없다** | `ACTIVE`/`BLOCKED`/`REVOKED` 는 애플리케이션 약속일 뿐 DB 가 강제하지 않는다 |
| `purchase_qrs.serial_number` | **시리얼은 카드가 아니라 QR 이 갖고 온다.** 시드에서 토큰은 `MCM-DEMO-2026-002`, 시리얼은 `MCM-2026-TOKYO-002` 로 서로 다르다 |
| `purchase_qrs` 의 `is_used`/`used_by`/`used_at` 3중 CHECK | 토큰은 1회용이고, 되돌리려면 세 컬럼을 함께 되돌려야 한다 |
| `collections.collection_type` = `CUSTOM` `AI` | 사용자 폴더와 AI 생성 컬렉션이 같은 테이블. 컬렉션 드롭다운이 나중에 대체될 자리 |
| `users.name` 이 NOT NULL, `nickname` 컬럼은 **없다** | 회원가입이 닉네임을 안 받는 설계와 맞는다. 이메일에서 시드해 `name` 으로 보낸다 |
| `users.deleted_at` (V3) | 소프트 탈퇴. **인증 필터는 이 값을 읽는데 로그인은 읽지 않는다** — 실측 확인 |
| `ai_resource_generations.generation_status` | 컬럼명은 `generation_status` 인데 DTO 는 `status` 로 내보낸다. 이름을 API 레이어에서 맞춘다 |
| `purchase_qrs` 시드 토큰은 **열한 개** | `MCM-DEMO-2026-001` ~ `-011`, 전부 `is_used = FALSE` 로 들어간다. 지금 DB 상태는 다르다 — 소진됐다 (`backend-open-items.md` §3) |
