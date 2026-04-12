import axios from 'axios';
import { SectorDataResponse, ConstituentResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const fetchSectorData = async (date: string): Promise<SectorDataResponse> => {
  try {
    const response = await api.get<SectorDataResponse>('/sectors', { params: { date } });
    return response.data;
  } catch (err) {
    // If the exact date has no data (weekend/holiday), fall back to latest available
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      const fallback = await api.get<SectorDataResponse>('/sectors/latest');
      return fallback.data;
    }
    throw err;
  }
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

export interface SubIndustry {
  name: string;
  count: number;
  constituents: string[];
}

export interface SubSectorsResponse {
  sector: string;
  subIndustries: SubIndustry[];
}

export async function fetchSubSectors(sector: string): Promise<SubSectorsResponse> {
  const response = await api.get<SubSectorsResponse>(`/sub-sectors/${encodeURIComponent(sector)}`);
  return response.data;
}

export default api;
