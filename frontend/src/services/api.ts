import axios from 'axios';
import { SectorDataResponse, ConstituentResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const fetchSectorData = async (date: string): Promise<SectorDataResponse> => {
  const response = await api.get<SectorDataResponse>('/sectors', { params: { date } });
  return response.data;
};

export const fetchConstituents = async (): Promise<ConstituentResponse> => {
  const response = await api.get<ConstituentResponse>('/constituents');
  return response.data;
};

export interface StockWeeklyReturn {
  symbol: string;
  sector: string | null;
  returnPct: number;
  closePrice: number | null;
  prevClosePrice: number | null;
  marketCapEstimate: number | null;
  weekEndDate: string;
  weekStartDate: string;
}

export async function fetchWeeklyReturns(date?: string): Promise<StockWeeklyReturn[]> {
  const params = date ? { date } : {};
  const response = await api.get<{ returns: StockWeeklyReturn[]; weekEndDate: string | null }>(
    '/stock-prices/weekly-returns',
    { params },
  );
  return response.data.returns;
}

export default api;
