import { request } from './client';
import { assetUrl } from '../config';
import type { CardTemplate, TemplateResource } from '../types';

/**
 * `GET /card-templates` — 하우스가 승인한 디자인 목록.
 *
 * **인증이 필요 없다** — 실서버에서 토큰 없이 200 이 온다. 다만 응답이 가리키는 썸네일
 * (`/images/templates/*.png`)은 여전히 401 이라, 그림은 `useProtectedUrl` 을 타야 한다.
 * 목록과 그림의 공개 여부가 다르다는 것이 이 도메인의 유일한 함정이다.
 *
 * 이 엔드포인트가 없던 시절의 기록이 `scope-vs-backend.md` §4-C 에 "커스텀 화면 블로커"로
 * 남아 있다. 08-19 에 열렸고, 그래서 카드 편집이 목이 아니라 실데이터로 만들어진다.
 */

type CardTemplateResponse = {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  description: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  allowedCardType: string | null;
  /** JSON 이 **문자열로** 온다. 컬럼이 그렇게 생겼다. */
  resourceData: string | null;
};

/**
 * `resourceData` 를 열어본다.
 *
 * 파싱을 API 층에서 한 번만 하는 이유는, 화면이 `JSON.parse` 를 부르기 시작하면 깨진 문자열을
 * 만났을 때의 처리가 화면마다 흩어지기 때문이다. **깨져 있으면 `null` 이고 템플릿 자체는
 * 살린다** — 색을 모르는 템플릿은 이름만으로도 고를 수 있지만, 색 하나 때문에 목록에서
 * 사라지는 템플릿은 고를 방법이 없다.
 */
function parseResource(raw: string | null): TemplateResource | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as TemplateResource;
  } catch {
    return null;
  }
}

function toTemplate(res: CardTemplateResponse): CardTemplate {
  return {
    id: res.id,
    brandId: res.brandId,
    brandName: res.brandName,
    name: res.name,
    description: res.description,
    frontImageUrl: assetUrl(res.frontImageUrl),
    backImageUrl: assetUrl(res.backImageUrl),
    /* 시드는 셋 다 null 이다 — 제한 없음이라는 뜻이고, 낯선 값이 오면 역시 제한 없음으로
       본다. 판단 근거가 없을 때 선택지를 지우는 것보다 남기는 편이 덜 틀린다. */
    allowedCardType:
      res.allowedCardType === 'BASIC' || res.allowedCardType === 'COLLECTOR'
        ? res.allowedCardType
        : null,
    resource: parseResource(res.resourceData),
  };
}

export async function fetchCardTemplates(): Promise<CardTemplate[]> {
  const list = await request<CardTemplateResponse[]>('/card-templates');
  return list.map(toTemplate);
}
