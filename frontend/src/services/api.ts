import axios from 'axios';
import { SectorDataResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const fetchSectorData = async (date: string): Promise<SectorDataResponse> => {
  const response = await api.get<SectorDataResponse>('/sectors', { params: { date } });
  return response.data;
};

export default api;
