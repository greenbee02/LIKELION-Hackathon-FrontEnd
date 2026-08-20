import type { Card } from '../types';

/**
 * ⚠️ 임시 — 보고 나면 지운다.
 *
 * 서버에 카드가 한 장도 없어서 컬렉션·상세·공유 화면을 열어볼 수 없을 때만 쓰는 가짜 카드다.
 * 이 저장소에는 목 데이터가 없다는 것이 규칙이고(AGENTS.md), 이 파일은 그 규칙의 예외가
 * 아니라 **잠깐 어긴 것**이다. 그래서 store 안에 섞여 들어가지 않고 파일 하나로 서 있다 —
 * 지우는 방법이 "이 파일과 `cards-store.tsx` 의 import 두 줄을 지운다"로 끝나야 한다.
 *
 * id 를 `c1`…`c4` 로 두는 것은 우연이 아니다. 번들된 카드 그림(`card-art.ts`)이 그 키로
 * 묶여 있고 브랜드 마크는 `mcm` 으로 묶여 있어서, 이 값들이라야 얼굴이 비지 않는다.
 * `product.imageUrl` 이 `null` 인 것도 같은 이유다 — 값이 있으면 `cardArtSource()` 가
 * 그쪽을 먼저 집고, 없는 주소를 부르러 간다.
 */

/**
 * `id` 는 실서버의 브랜드 UUID 그대로다 — `GET /card-templates` 가 돌려주는 `brandId` 와
 * 같은 값이라야 꾸미기 1단계가 이 카드에 붙일 수 있는 디자인을 찾는다. `'mcm'` 같은
 * 사람이 읽는 문자열을 두면 `usableTemplates()` 가 세 개를 전부 걸러내고, 화면은
 * "적용할 수 있는 디자인이 아직 없습니다"로 굳는다 — 서버에는 있는데도.
 */
const BRAND = {
  id: '20000000-0000-0000-0000-000000000001',
  name: 'MCM',
  accent: '#6E4B2A',
  logoUrl: null,
};

export const DEMO_CARDS: Card[] = [
  {
    id: 'c1',
    cardType: 'BASIC',
    status: 'ACTIVE',
    purchaseDate: '2026-07-14T04:20:00Z',
    issuedAt: '2026-07-14T04:22:00Z',
    serialNumber: 'MCM-2026-000131',
    brand: BRAND,
    product: {
      id: 'p1',
      name: 'Visetos 트롤리 22',
      category: '여행가방',
      imageUrl: null,
      limited: true,
      material: '코티드 캔버스 · 레더 트림',
      color: 'Cognac',
      origin: '이탈리아',
      warrantyMonths: 24,
      code: 'MMYFSVI01',
      warrantyInfo: '제조상 결함에 한해 무상 수리해 드립니다.',
      collection: { id: 'pc1', name: 'Seoul Exclusive' },
    },
    store: { id: 's1', name: 'MCM 청담 플래그십', country: '대한민국', city: 'SEOUL' },
  },
  {
    id: 'c2',
    cardType: 'BASIC',
    status: 'ACTIVE',
    purchaseDate: '2026-05-02T07:05:00Z',
    issuedAt: '2026-05-02T07:06:00Z',
    serialNumber: 'MCM-2026-000094',
    brand: BRAND,
    product: {
      id: 'p2',
      name: '드로스트링 백 미니',
      category: '가방',
      imageUrl: null,
      limited: false,
      material: '비세토스 캔버스',
      color: 'Orangeade',
      origin: '대한민국',
      warrantyMonths: 12,
      code: 'MWDFSVI02',
      collection: { id: 'pc1', name: 'Seoul Exclusive' },
    },
    store: { id: 's2', name: 'MCM 잠실', country: '대한민국', city: 'SEOUL' },
  },
  {
    id: 'c3',
    cardType: 'BASIC',
    status: 'ACTIVE',
    purchaseDate: '2026-03-19T13:40:00Z',
    issuedAt: '2026-03-19T13:41:00Z',
    serialNumber: 'MCM-2026-000051',
    brand: BRAND,
    product: {
      id: 'p3',
      name: '로고 자카드 카디건',
      category: '의류',
      imageUrl: null,
      limited: false,
      material: '울 80% · 캐시미어 20%',
      origin: '프랑스',
      code: 'MFCFSVI03',
    },
    store: { id: 's3', name: 'MCM 파리 마레', country: '프랑스', city: 'PARIS' },
  },
];
