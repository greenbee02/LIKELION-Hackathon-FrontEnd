/**
 * 백엔드가 코드로 주는 값을 화면의 말로 바꾼다.
 *
 * `products.category` 는 `SHIRT`, `season` 은 `FW`, `theme` 는 `NEW_ARRIVAL` 처럼 enum 코드로
 * 온다. 목데이터는 한국어였으므로 그대로 뿌리면 화면에 영문 대문자가 튀어나온다.
 *
 * **표에 없는 코드는 원문 그대로 돌려준다.** 브랜드가 하나 늘어 새 카테고리가 들어왔다고
 * 화면이 비는 것보다는, 낯선 단어라도 무언가 적혀 있는 편이 낫다 — 번역표는 화면을 막는
 * 관문이 아니라 다듬는 층이다.
 *
 * 값은 마이그레이션과 시드(V4·V7)에서 확인한 것만 적었다. 추측한 항목은 없다.
 */

const CATEGORY: Record<string, string> = {
  BAG: '가방',
  BACKPACK: '백팩',
  SHIRT: '셔츠',
  SCARF: '스카프',
  WALLET: '지갑',
  SHOES: '신발',
  ACCESSORY: '액세서리',
  JEWELRY: '주얼리',
  OUTER: '아우터',
  BELT: '벨트',
  HAT: '모자',
};

const SEASON: Record<string, string> = {
  SS: '봄여름',
  FW: '가을겨울',
  ALL_SEASON: '사계절',
  RESORT: '리조트',
};

const THEME: Record<string, string> = {
  NEW_ARRIVAL: '신상품',
  REGIONAL: '지역 한정',
  WOMEN: '여성',
  MEN: '남성',
  TRAVEL: '트래블',
  ICON: '아이코닉',
};

/**
 * `products.offering_type` — V4 의 CHECK 제약이 정한 여섯 가지.
 *
 * 이 제품이 물건이 아닐 수도 있다는 뜻이라 의미가 작지 않다. 다만 지금 시드는 전부
 * `PRODUCT` 이고, 경험형 카드를 다르게 그릴지는 아직 결정된 것이 없어 표만 준비해 둔다.
 */
const OFFERING: Record<string, string> = {
  PRODUCT: '상품',
  ART: '아트',
  GASTRONOMY: '다이닝',
  TRAVEL: '트래블',
  EVENT: '이벤트',
  OTHER: '기타',
};

const lookup = (table: Record<string, string>, code: string | null | undefined) =>
  code ? (table[code] ?? code) : undefined;

export const categoryLabel = (code: string | null | undefined) => lookup(CATEGORY, code);
export const seasonLabel = (code: string | null | undefined) => lookup(SEASON, code);
export const themeLabel = (code: string | null | undefined) => lookup(THEME, code);
export const offeringLabel = (code: string | null | undefined) => lookup(OFFERING, code);
