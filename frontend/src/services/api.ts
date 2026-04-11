import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface SectorDataResponse {
  date: string;
  sectors: Array<{
    date: string;
    sector: string;
    weightedPeRatio: number;
    equalWeightPeRatio: number;
    weightedMarketCap: number;
    constituents: number;
    lastUpdated: string;
  }>;
}

export const fetchSectorData = async (date: string): Promise<SectorDataResponse> => {
  const response = await api.get('/sectors', { params: { date } });
  return response.data;
};

export const fetchSectorHistory = async (
  sector: string,
  days?: number
): Promise<any> => {
  const response = await api.get(`/sectors/${sector}/history`, {
    params: { days },
  });
  return response.data;
};

export default api;
