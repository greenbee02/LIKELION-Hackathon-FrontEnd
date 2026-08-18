import type { DropdownOption } from '@/components/ui/dropdown';
import type { Card } from './types';

export const ALL_FILTER = 'all';

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
 */
export function collectionFilters(cards: Card[]): CollectionFilter[] {
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

  return filters;
}
