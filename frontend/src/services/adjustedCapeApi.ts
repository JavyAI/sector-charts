import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface InterestRateContext {
  current: number;
  historical10yAvg: number;
  historicalLongtermAvg: number;
}

export interface AdjustmentBreakdown {
  interestRate: number;
  total: number;
}

export interface AdjustedCapeResponse {
  years: number | 'ALL';
  traditionalCape: number;
  adjustedCape: number;
  excessCapeYield: number;
  interestRateContext: InterestRateContext;
  adjustments: AdjustmentBreakdown;
}

export async function fetchAdjustedCape(years: number = 10): Promise<AdjustedCapeResponse> {
  const response = await api.get<AdjustedCapeResponse>(
    `/shiller/adjusted-cape?years=${years}`,
  );
  return response.data;
}
