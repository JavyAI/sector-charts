import { renderHook, waitFor } from '@testing-library/react';
import { useSectorData } from './useSectorData';
import * as api from '../services/api';
import { vi } from 'vitest';

vi.mock('../services/api');

describe('useSectorData hook', () => {
  it('should load sector data', async () => {
    const mockData = {
      date: '2024-04-11',
      sectors: [
        {
          date: '2024-04-11',
          sector: 'Technology',
          weightedPeRatio: 21.4,
          equalWeightPeRatio: 19.6,
          weightedMarketCap: 10000000000,
          constituents: 50,
          lastUpdated: '2024-04-11T00:00:00Z',
        },
      ],
    };

    vi.mocked(api.fetchSectorData).mockResolvedValue(mockData);

    const { result } = renderHook(() => useSectorData('2024-04-11'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });
});
