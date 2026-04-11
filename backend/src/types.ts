export interface StockFundamental {
  symbol: string;
  companyName: string;
  marketCap: number;
  peRatio: number | null;
  eps: number | null;
  shares: number;
}

export interface SectorMetric {
  date: string;
  sector: string;
  weightedPeRatio: number;
  equalWeightPeRatio: number;
  weightedMarketCap: number;
  constituents: number;
  lastUpdated: string;
}

export interface HistoricalSectorMetric extends SectorMetric {
  peRatioPctChange5Yr: number;
  peRatioPctChange10Yr: number;
  ytdReturn: number;
}

export interface CacheEntry {
  key: string;
  value: string;
  expiresAt: number;
}
