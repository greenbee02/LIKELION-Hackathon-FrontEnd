# DB 스키마 — 마이그레이션 기준

기준: `greenbee02/LIKELION-Hackathon-BackEnd` `src/main/resources/db/migration/` V1 ~ V7
갱신일: 2026-08-20

> **이 문서의 근거가 바뀌었다.** 이전 판은 백엔드 팀이 공유한 **MySQL 초안**을 그대로 옮긴
> 것이었고 "정확하지 않을 수 있다"는 단서가 붙어 있었다. 지금은 실제 저장소의 Flyway
> 마이그레이션 파일이 기준이고, 그 파일들이 배포된 DB 를 만든 것이므로 추측이 아니다.
>
> 초안과 실물의 가장 큰 차이는 **DBMS 자체**다 — 초안은 MySQL 8.0 문법이었지만 실제 스키마는
> **PostgreSQL** 이다 (`UUID`, `TIMESTAMP WITH TIME ZONE`, `JSONB`, `NUMERIC(5,2)`).
>
> **다만 여전히 컬럼이 있다는 것과 API 로 내려온다는 것은 다르다.** 프론트가 실제로 받을 수
> 있는 필드는 `dev/active/backend-integration-plan.md` 가 기준이고, 그쪽이 이 문서보다 우선한다.
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

---

## 프론트가 실제로 기대고 있는 것

마이그레이션에서 확인한 사실만 적는다.

| 스키마 사실 | 프론트에서의 뜻 |
|---|---|
| `rewards.reward_type` CHECK = `PHYSICAL_CARD` `GOODS` `EVENT_INVITATION` `BENEFIT` | 우리 `RewardKind` 3종이 근거를 갖는다. **다만 API 가 이 값을 안 내보내서** 지금 만들 수 있는 것은 `EVENT`·`BENEFIT` 둘뿐이다 |
| `user_rewards.status` CHECK = `UNLOCKED` `CLAIMED` `EXPIRED` `CANCELLED` | 네 번째 값 `CANCELLED` 가 있다. 우리는 목록에서 제외한다 — 만료로 보이면 이유가 틀리고, 잠긴 것으로 보이면 열리지 않을 것을 권하게 된다 |
| `user_rewards.claim_code` 가 UNIQUE 이고 해금 시점에 비어 있다 | 코드는 **수령 요청이 만든다.** 리워드 상세가 "코드를 보여주는 화면"이 아니라 "코드를 발급받는 화면"인 이유 |
| `collection_rewards.required_percentage` NUMERIC(5,2), `> 0 AND <= 100` | 해금 조건은 장수가 아니라 퍼센트다. 화면이 쓰는 장수는 `ceil(퍼센트 × 필수상품수)` 로 환산한 값 |
| `collection_rewards` 는 대상당 여러 행을 허용 | 한 리워드가 두 컬렉션에 걸릴 수 있어, 합칠 때 중복을 걸러야 한다 |
| `product_collection_items.is_required` | 달성률 분모는 컬렉션 전체가 아니라 필수 상품 수다 |
| **`brands.logo_url` 이 있다** | `Brand.logoUrl` 에 실제 출처가 있다는 뜻. **어느 DTO 도 내보내지 않아** 지금은 null 이고, 카드는 이름을 타이포로 서명한다 |
| **브랜드 액센트 컬러 컬럼은 없다** | `Brand.accent` 는 계속 토큰이다. 하우스의 색을 데이터로 받는다는 설계는 아직 근거가 없다 |
| `cards` 에 `brand_id` 가 없다 | 브랜드는 `products.brand_id` 를 타고 유도된다. 그래서 카드를 상품으로 한 번 더 채운다 |
| `products.offering_type` CHECK 에 `ART` `GASTRONOMY` `TRAVEL` `EVENT` | 카드가 항상 물건인 것은 아니다. "상품"을 전제로 쓴 문구는 나중에 흔들릴 수 있다 |
| `card_templates.allowed_card_type` CHECK = `BASIC` `COLLECTOR` (NULL 허용) | `CUSTOMIZE` 는 여기 없다 — 카드의 상태이지 템플릿의 종류가 아니다. 시드는 세 템플릿 모두 NULL |
| `cards.status` 에는 CHECK 가 **없다** | `ACTIVE`/`BLOCKED`/`REVOKED` 는 애플리케이션 약속일 뿐 DB 가 강제하지 않는다 |
| `purchase_qrs.serial_number` | **시리얼은 카드가 아니라 QR 이 갖고 온다.** 시드에서 토큰은 `MCM-DEMO-2026-002`, 시리얼은 `MCM-2026-TOKYO-002` 로 서로 다르다 |
| `purchase_qrs` 의 `is_used`/`used_by`/`used_at` 3중 CHECK | 토큰은 1회용이고, 되돌리려면 세 컬럼을 함께 되돌려야 한다 |
| `collections.collection_type` = `CUSTOM` `AI` | 사용자 폴더와 AI 생성 컬렉션이 같은 테이블. 컬렉션 드롭다운이 나중에 대체될 자리 |
| `users.name` 이 NOT NULL, `nickname` 컬럼은 **없다** | 회원가입이 닉네임을 안 받는 설계와 맞는다. 이메일에서 시드해 `name` 으로 보낸다 |
| `users.deleted_at` (V3) | 소프트 탈퇴. **인증 필터는 이 값을 읽는데 로그인은 읽지 않는다** — 연동 계획 §4-6 |
| `ai_resource_generations.generation_status` | 컬럼명은 `generation_status` 인데 DTO 는 `status` 로 내보낸다. 이름을 API 레이어에서 맞춘다 |
