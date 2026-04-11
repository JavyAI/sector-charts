import { renderHook, waitFor } from '@testing-library/react';
import { useSectorData } from './useSectorData';
import * as api from '../services/api';
import { vi } from 'vitest';

vi.mock('../services/api');

describe('useSectorData hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('transitions to error state when API fails', async () => {
    vi.mocked(api.fetchSectorData).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSectorData('2024-04-11'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('re-fetches when date prop changes', async () => {
    const mockData1 = {
      date: '2024-04-11',
      sectors: [],
    };
    const mockData2 = {
      date: '2024-04-12',
      sectors: [],
    };

    vi.mocked(api.fetchSectorData)
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(({ date }) => useSectorData(date), {
      initialProps: { date: '2024-04-11' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData1);

    rerender({ date: '2024-04-12' });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(vi.mocked(api.fetchSectorData)).toHaveBeenCalledTimes(2);
  });

  it('does not update state after unmount', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let resolvePromise!: (value: { date: string; sectors: never[] }) => void;
    const deferred = new Promise<{ date: string; sectors: never[] }>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(api.fetchSectorData).mockReturnValue(deferred);

    const { unmount } = renderHook(() => useSectorData('2024-04-11'));

    // Unmount before the promise resolves
    unmount();

    // Now resolve the promise after unmount
    resolvePromise({ date: '2024-04-11', sectors: [] });

    // Wait a tick to allow any pending microtasks to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
