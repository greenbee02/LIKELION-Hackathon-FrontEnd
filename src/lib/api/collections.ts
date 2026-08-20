import { request } from './client';
import type { UserCollection } from '../types';

/**
 * 고객이 만든 컬렉션 — `GET/POST /collections`, `GET/PATCH/DELETE /collections/{id}`,
 * `POST/DELETE /collections/{id}/cards`.
 *
 * 하우스가 묶은 `product-collections` 와 이름만 비슷한 다른 도메인이다. 그쪽은 상품을 묶고
 * 리워드가 세어지는 단위이고, 이쪽은 **카드를 묶고 아무것도 해금하지 않는다.**
 *
 * **응답이 카드를 통째로 실어 오지만 우리는 id 만 남긴다.** `cards: CardResponse[]` 를 카드로
 * 만들려면 `hydrateCard()` 가 각각 상품을 한 번 더 조회해야 하고, 그러면 컬렉션 하나를 여는
 * 데 담긴 카드 수만큼 왕복이 늘어난다. 카드 본문은 `cards-store` 가 이미 전부 들고 있으므로
 * 여기서 필요한 것은 **어느 카드가 들어 있는가** 하나뿐이다.
 */

type UserCollectionResponse = {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  collectionType: string;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  /** `CardResponse[]` 이지만 우리는 id 만 본다 — 위 주석 참고. */
  cards: { id: string }[] | null;
};

function toCollection(res: UserCollectionResponse): UserCollection {
  return {
    id: res.id,
    name: res.name,
    description: res.description ?? undefined,
    coverImageUrl: res.coverImageUrl,
    /* 서버가 아는 값은 `CUSTOM` 과 `AI` 뿐이고 생성 요청에는 이 필드가 없다. 낯선 값이 오면
       사용자가 만든 것으로 친다 — 분류를 모르는 것이 컬렉션을 잃는 것보다 낫다. */
    collectionType: res.collectionType === 'AI' ? 'AI' : 'CUSTOM',
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
    cardCount: res.cardCount ?? 0,
    cardIds: (res.cards ?? []).map((c) => c.id),
  };
}

export async function fetchCollections(): Promise<UserCollection[]> {
  const list = await request<UserCollectionResponse[]>('/collections');
  return list.map(toCollection);
}

export async function fetchCollection(id: string): Promise<UserCollection> {
  return toCollection(await request<UserCollectionResponse>(`/collections/${id}`));
}

export type CollectionInput = {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
};

export async function createCollection(body: CollectionInput): Promise<UserCollection> {
  return toCollection(
    await request<UserCollectionResponse>('/collections', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCollection(
  id: string,
  body: Partial<CollectionInput>,
): Promise<UserCollection> {
  return toCollection(
    await request<UserCollectionResponse>(`/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  );
}

export const deleteCollection = (id: string) =>
  request<void>(`/collections/${id}`, { method: 'DELETE' });

export const addCardToCollection = (id: string, cardId: string) =>
  request<void>(`/collections/${id}/cards`, {
    method: 'POST',
    body: JSON.stringify({ cardId }),
  });

export const removeCardFromCollection = (id: string, cardId: string) =>
  request<void>(`/collections/${id}/cards/${cardId}`, { method: 'DELETE' });
