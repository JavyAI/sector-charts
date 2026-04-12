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

export interface Constituent {
  symbol: string;
  security: string;
  gics_sector: string;
  gics_sub_industry: string;
}

export interface ConstituentResponse {
  count: number;
  constituents: Constituent[];
}

