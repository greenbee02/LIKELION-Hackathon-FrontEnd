import type { DropdownOption } from '@/components/ui/dropdown';
import type { Card, UserCollection } from './types';

export const ALL_FILTER = 'all';

/**
 * 필터가 아닌 유일한 행. 고르면 걸러지는 대신 컬렉션 관리 화면이 열린다.
 *
 * 메뉴에 조작을 섞는 것은 예외이고, 그 예외를 두는 이유는 **첫 폴더를 만들 길이 그것뿐이기
 * 때문**이다. 폴더가 하나도 없으면 `내 컬렉션` 그룹 자체가 생기지 않으므로, 폴더에서 파생된
 * 행에 관리 입구를 얹을 수 없다. 그래서 이 행만은 폴더가 0개여도 항상 나온다.
 */
export const MANAGE_FILTER = 'manage';

export type CollectionFilter = DropdownOption & {
  /** What the screen's title reads while this filter is on. */
  title: string;
  match: (card: Card) => boolean;
};

/**
 * The filters the collection can actually offer, worked out from the cards in hand.
 *
 * Nothing here is a fixed list. A filter appears only when it would divide the collection — no
 * 한정판 row if none of the cards is limited, no city rows if every purchase happened in one
 * place, no brand rows until a second house arrives. That rule does two things at once: it keeps
 * the customer from tapping into an empty screen, and it means the menu has no dead entries to
 * explain. It also means every filter is guaranteed to return at least one card, which is why the
 * collection screen has one empty state rather than two.
 *
 * Derived rather than declared, so onboarding a brand or opening a store in a new city adds a row
 * here without anyone editing this file.
 *
 * **개인 컬렉션도 여기 합류한다.** 폴더는 결국 "가진 것 중 이만큼"이고, 그건 이 메뉴가 이미
 * 하고 있는 일과 같은 종류다. 별도의 컨트롤을 헤더에 하나 더 다는 대신 그룹을 하나 더 여는
 * 편이 화면을 늘리지 않는다 — 메뉴는 항목이 둘이든 스물이든 같은 크기다.
 *
 * 빈 폴더는 행을 만들지 않는다. 다른 모든 행이 지키는 규칙과 같다 — 눌러서 아무것도 없는
 * 화면에 도착하는 항목은 만들지 않는다. 폴더 자체는 `/collection` 에 그대로 남는다.
 */
export function collectionFilters(
  cards: Card[],
  folders: UserCollection[] = [],
): CollectionFilter[] {
  const filters: CollectionFilter[] = [
    {
      value: ALL_FILTER,
      label: '전체',
      title: '내 컬렉션',
      hint: `${cards.length}장`,
      match: () => true,
    },
  ];

  const limited = cards.filter((c) => c.product.limited).length;
  if (limited > 0 && limited < cards.length) {
    filters.push({
      value: 'limited',
      label: '한정판',
      title: '한정판',
      hint: `${limited}장`,
      group: '종류',
      match: (c) => c.product.limited,
    });
  }

  const brands = new Map<string, { name: string; count: number }>();
  for (const c of cards) {
    const seen = brands.get(c.brand.id);
    if (seen) seen.count += 1;
    else brands.set(c.brand.id, { name: c.brand.name, count: 1 });
  }
  if (brands.size > 1) {
    for (const [id, brand] of brands) {
      filters.push({
        value: `brand:${id}`,
        label: brand.name,
        title: brand.name,
        hint: `${brand.count}장`,
        group: '브랜드',
        match: (c) => c.brand.id === id,
      });
    }
  }

  const cities = new Map<string, number>();
  for (const c of cards) cities.set(c.store.city, (cities.get(c.store.city) ?? 0) + 1);
  if (cities.size > 1) {
    for (const [city, count] of cities) {
      /* The city keeps the spelling the card face engraves. Translating it here would put two
         names on one place inside a single screen. */
      filters.push({
        value: `city:${city}`,
        label: city,
        title: city,
        hint: `${count}장`,
        group: '도시',
        match: (c) => c.store.city === city,
      });
    }
  }

  /* 폴더가 맨 아래인 것은 순서가 아니라 위계다. 위의 셋은 카드가 스스로 말하는 사실
     (한정판인가, 어느 하우스인가, 어느 도시인가)이고, 폴더는 고객이 나중에 얹은 뜻이다. */
  for (const folder of folders) {
    if (folder.cardIds.length === 0) continue;
    const ids = new Set(folder.cardIds);
    filters.push({
      value: `folder:${folder.id}`,
      label: folder.name,
      title: folder.name,
      hint: `${folder.cardIds.length}장`,
      group: '내 컬렉션',
      match: (c) => ids.has(c.id),
    });
  }

  /* 그룹 헤딩은 같은 그룹이 붙어 있을 때만 그려지므로, 이 행은 폴더 행들 바로 뒤여야 한다.
     폴더가 없으면 이 행 하나가 그룹 전체가 된다. `match` 는 쓰이지 않는다 — 화면이 이 값을
     가로채 라우팅하고 필터로는 절대 넘기지 않는다. */
  filters.push({
    value: MANAGE_FILTER,
    label: '컬렉션 관리',
    title: '내 컬렉션',
    group: '내 컬렉션',
    match: () => true,
  });

  return filters;
}
