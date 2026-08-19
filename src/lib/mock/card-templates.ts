import type { CardTemplate } from '../types';

/**
 * 승인 템플릿 — 목.
 *
 * **실서버 응답 세 건을 그대로 옮겼다.** 이름·설명·색·패턴 전부 `GET /card-templates` 가
 * 실제로 돌려주는 값이고, 바꾼 것은 `brandId` 뿐이다 — 실서버는 UUID 를 주는데 목 카드의
 * 하우스 id 는 `mcm` 이라, 그대로 두면 브랜드가 맞지 않아 목록이 통째로 비어 보인다.
 *
 * 네 번째만 지어냈다. `atelier` 는 목 카드를 한 장도 발급하지 않지만 스캔 목에는 등장하므로,
 * **브랜드가 다른 템플릿이 걸러지는지**를 목에서도 시험할 수 있어야 한다. 하우스가 하나뿐인
 * 목록에서는 그 필터가 일하는지 알 수 없다.
 *
 * 썸네일 주소는 실서버 경로 그대로 두었다. 목 모드에서는 401 이 아니라 그냥 안 뜨고, 그러면
 * 타일이 이름을 타이포로 세우는 폴백으로 떨어진다 — 그 폴백도 시험돼야 하는 상태다.
 */
export const MOCK_CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'tpl-mock-001',
    brandId: 'mcm',
    brandName: 'MCM',
    name: 'MCM Classic Visetos',
    description: '클래식 비세토스 패턴과 블랙·코냑 색상을 활용한 카드 템플릿',
    frontImageUrl: '/images/templates/template_001_front.png',
    backImageUrl: '/images/templates/template_001_back.png',
    allowedCardType: null,
    resource: {
      pattern: 'VISETOS_MONOGRAM',
      fontStyle: 'CLASSIC_SERIF',
      textColor: '#E8DFD2',
      backLayout: 'PURCHASE_RECORD',
      accentColor: '#B89A6A',
      frontLayout: 'PRODUCT_HERO',
      graphicStyle: 'QUIET_LUXURY',
      primaryColor: '#15120F',
      secondaryColor: '#8B6B45',
    },
  },
  {
    id: 'tpl-mock-002',
    brandId: 'mcm',
    brandName: 'MCM',
    name: 'AW26 Sangria Sunset',
    description: 'AW26 상그리아 색상과 절제된 디스코 그래픽을 활용한 시즌 카드 템플릿',
    frontImageUrl: '/images/templates/template_002_front.png',
    backImageUrl: '/images/templates/template_002_back.png',
    allowedCardType: null,
    resource: {
      pattern: 'DISCO_MONOGRAM',
      fontStyle: 'MODERN_SANS',
      textColor: '#F2E7DA',
      backLayout: 'PURCHASE_RECORD',
      accentColor: '#C4A16B',
      frontLayout: 'PRODUCT_HERO',
      graphicStyle: 'SEASONAL_LUXURY',
      primaryColor: '#1B1218',
      secondaryColor: '#6E1F38',
    },
  },
  {
    id: 'tpl-mock-003',
    brandId: 'mcm',
    brandName: 'MCM',
    name: 'Seoul Night Edition',
    description: '서울의 밤 풍경을 담은 지역 한정 카드 템플릿',
    frontImageUrl: '/images/templates/template_003_front.png',
    backImageUrl: '/images/templates/template_003_back.png',
    allowedCardType: null,
    resource: {
      pattern: 'SEOUL_NIGHT',
      fontStyle: 'MODERN_SANS',
      textColor: '#E6EAF0',
      backLayout: 'PURCHASE_RECORD',
      accentColor: '#B8B4AA',
      frontLayout: 'PRODUCT_HERO',
      graphicStyle: 'QUIET_LUXURY',
      primaryColor: '#07111D',
      secondaryColor: '#26384D',
    },
  },
  {
    id: 'tpl-mock-004',
    brandId: 'atelier',
    brandName: 'Atelier',
    name: 'Atelier Blanc',
    description: '여백을 크게 둔 아틀리에의 기본 템플릿',
    frontImageUrl: null,
    backImageUrl: null,
    allowedCardType: null,
    resource: {
      fontStyle: 'CLASSIC_SERIF',
      textColor: '#1A1A1A',
      accentColor: '#8A8A8A',
      graphicStyle: 'MINIMAL',
      primaryColor: '#F5F3EF',
      secondaryColor: '#D8D4CC',
    },
  },
];
