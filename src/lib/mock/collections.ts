import { ApiError } from '../api/client';
import type { CollectionInput } from '../api/collections';
import type { UserCollection } from '../types';

/**
 * 개인 컬렉션의 목 — `mock/registrations.ts` 와 같은 작은 서버다.
 *
 * 배열 하나로 끝나지 않는 이유는 **여기에 쓰기가 있기 때문**이다. 만들고, 이름을 바꾸고,
 * 카드를 담고 빼고, 지운다. 그 결과가 화면을 옮겨 다녀도 남아 있어야 목이 목 노릇을 한다.
 * 그래서 모듈이 상태를 들고, 없는 것을 부르면 진짜 `ApiError` 를 던진다 — 호출부는 목인지
 * 실서버인지 알 필요가 없다.
 *
 * 앱을 다시 켜면 사라진다. 목의 수명은 세션이고, 그것을 넘기려면 저장소가 필요한데 그건
 * 목이 아니라 두 번째 백엔드다.
 */

const store = new Map<string, UserCollection>();
let sequence = 0;

function nextId() {
  sequence += 1;
  return `col-mock-${String(sequence).padStart(3, '0')}`;
}

function stamp() {
  return new Date().toISOString();
}

/**
 * 처음 한 번, 하나만 만들어 둔다.
 *
 * 목록이 비어 있기만 하면 빈 화면은 볼 수 있어도 채워진 화면을 볼 수 없고, 반대로 넷을 채워
 * 두면 빈 화면을 볼 방법이 없다. 하나면 둘 다 볼 수 있다 — 지우면 빈 화면이다.
 *
 * 담긴 카드는 `MOCK_CARDS` 의 서울 두 장(`c1` `c2`)이다. 카드 쪽 목이 바뀌어 이 id 가
 * 사라지면 컬렉션은 빈 채로 남는데, 그것도 화면이 다뤄야 하는 상태이므로 맞추려 애쓰지 않는다.
 */
function seed() {
  if (sequence > 0) return;
  const id = nextId();
  const now = stamp();
  store.set(id, {
    id,
    name: '서울에서',
    description: '서울에서 만난 것들',
    coverImageUrl: null,
    collectionType: 'CUSTOM',
    createdAt: now,
    updatedAt: now,
    cardCount: 2,
    cardIds: ['c1', 'c2'],
  });
}

function get(id: string): UserCollection {
  const found = store.get(id);
  if (!found) throw new ApiError('COLLECTION_NOT_FOUND', '컬렉션을 찾을 수 없습니다.');
  return found;
}

/** 담긴 카드 수는 목록에서 파생한다 — 두 값이 어긋날 수 있는 자리를 만들지 않는다. */
function put(collection: UserCollection) {
  const next = { ...collection, cardCount: collection.cardIds.length, updatedAt: stamp() };
  store.set(next.id, next);
  return next;
}

export function mockFetchCollections(): UserCollection[] {
  seed();
  return [...store.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function mockFetchCollection(id: string): UserCollection {
  seed();
  return get(id);
}

export function mockCreateCollection(body: CollectionInput): UserCollection {
  seed();
  const now = stamp();
  return put({
    id: nextId(),
    name: body.name,
    description: body.description,
    coverImageUrl: body.coverImageUrl ?? null,
    collectionType: 'CUSTOM',
    createdAt: now,
    updatedAt: now,
    cardCount: 0,
    cardIds: [],
  });
}

export function mockUpdateCollection(id: string, body: Partial<CollectionInput>): UserCollection {
  const current = get(id);
  return put({
    ...current,
    name: body.name ?? current.name,
    description: body.description ?? current.description,
    coverImageUrl: body.coverImageUrl ?? current.coverImageUrl,
  });
}

export function mockDeleteCollection(id: string): void {
  get(id);
  store.delete(id);
}

export function mockAddCard(id: string, cardId: string): void {
  const current = get(id);
  if (current.cardIds.includes(cardId)) return;
  put({ ...current, cardIds: [...current.cardIds, cardId] });
}

export function mockRemoveCard(id: string, cardId: string): void {
  const current = get(id);
  put({ ...current, cardIds: current.cardIds.filter((c) => c !== cardId) });
}
