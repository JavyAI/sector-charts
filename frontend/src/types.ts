export interface SectorMetric {
  date: string;
  sector: string;
  weightedPeRatio: number;
  equalWeightPeRatio: number;
  weightedMarketCap: number;
  constituents: number;
  lastUpdated: string;
}

export interface SectorDataResponse {
  date: string;
  sectors: SectorMetric[];
}

export interface SectorHistoryResponse {
  sector: string;
  history: SectorMetric[];
}
