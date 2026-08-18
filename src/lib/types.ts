/** Mirrors the backend's `CardResponse`, plus `brand` — see dev/active/scope-vs-backend.md §5-1. */

export type CardType = 'BASIC' | 'CUSTOMIZE' | 'COLLECTOR';
export type CardStatus = 'ACTIVE' | 'BLOCKED' | 'REVOKED';

export type Brand = {
  id: string;
  name: string;
  /** The brand's accent, carried as data. The app's own chrome never uses it. */
  accent: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  limited: boolean;
  /** §5-2 — columns exist, DTO does not expose them yet. Mock until it does. */
  material?: string;
  origin?: string;
  warrantyMonths?: number;
  careInfo?: string;
  season?: string;
};

export type Store = { id: string; name: string; country: string; city: string };

export type Card = {
  id: string;
  cardType: CardType;
  status: CardStatus;
  /** ISO-8601 UTC, as the backend sends it. Convert at the edge of the UI, not in the store. */
  purchaseDate: string;
  issuedAt: string;
  serialNumber: string;
  brand: Brand;
  product: Product;
  store: Store;
};

/** Every reward belongs to a brand; a card from one house never advances another's. */
export type RewardKind = 'EVENT' | 'BENEFIT' | 'GOODS';

export type Reward = {
  id: string;
  brandId: string;
  kind: RewardKind;
  title: string;
  /** The official collection it tracks, and how far along the customer is. */
  collection: string;
  progress: number;
  total: number;
};
