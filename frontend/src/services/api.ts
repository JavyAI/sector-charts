import axios from 'axios';
import { SectorDataResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const fetchSectorData = async (date: string): Promise<SectorDataResponse> => {
  const response = await api.get('/sectors', { params: { date } });
  return response.data;
};

export const fetchSectorHistory = async (
  sector: string,
  days?: number
): Promise<unknown> => {
  const response = await api.get(`/sectors/${sector}/history`, {
    params: { days },
  });
  return response.data;
};

export default api;
