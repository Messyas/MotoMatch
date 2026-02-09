export interface AdminTotals {
  usuarios: number;
  dispositivos: number;
  admins: number;
  suporte: number;
}

export interface UsersTimelinePoint {
  month: string;
  total: number;
}

export interface FavoriteRankingItem {
  dispositivoId: string;
  title: string;
  favorites: number;
}

export interface SelectorStatItem {
  value: string;
  count: number;
}

export interface SelectorStatMap {
  ram: SelectorStatItem[];
  rom: SelectorStatItem[];
  battery: SelectorStatItem[];
  camera: SelectorStatItem[];
  benchmark: SelectorStatItem[];
  price_range: SelectorStatItem[];
}

export interface SelectorTimelinePoint {
  month: string;
  counts: SelectorStatItem[];
}

export interface SelectorTimelineMap {
  ram: SelectorTimelinePoint[];
  rom: SelectorTimelinePoint[];
  battery: SelectorTimelinePoint[];
  camera: SelectorTimelinePoint[];
  benchmark: SelectorTimelinePoint[];
  price_range: SelectorTimelinePoint[];
}

export interface SearchUsageMetrics {
  total: number;
  withText: number;
  withoutText: number;
  textOnly: number;
  selectorsOnly: number;
  textAndSelectors: number;
}

export interface AdminOverviewMetrics {
  totals: AdminTotals;
  timeline: UsersTimelinePoint[];
  favorites: {
    top: FavoriteRankingItem[];
    bottom: FavoriteRankingItem[];
  };
  searches: SearchUsageMetrics;
  selectorStats: SelectorStatMap;
  selectorTimeline: SelectorTimelineMap;
  priceRangeStats: SelectorStatItem[];
  precos: {
    medio: number;
    minimo: number;
    maximo: number;
    dispositivoMaisBarato: string | null;
    dispositivoMaisCaro: string | null;
  };
  precosFavoritos: {
    medio: number;
  };
}
