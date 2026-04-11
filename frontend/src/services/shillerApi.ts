import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface MarketPEStats {
  median: number;
  mean: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
}

export interface MarketPEResponse {
  years: number | 'ALL';
  stats: MarketPEStats;
}

export async function fetchMarketPE(years: number = 10): Promise<MarketPEResponse> {
  const response = await api.get<MarketPEResponse>(`/shiller/market-pe?years=${years}`);
  return response.data;
}
