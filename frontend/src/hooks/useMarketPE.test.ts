import { renderHook, waitFor } from '@testing-library/react';
import { useMarketPE } from './useMarketPE';
import * as shillerApi from '../services/shillerApi';
import { vi } from 'vitest';

vi.mock('../services/shillerApi');

describe('useMarketPE hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    vi.mocked(shillerApi.fetchMarketPE).mockResolvedValue({
      years: 10,
      stats: { median: 25, mean: 24, min: 10, max: 40, p25: 18, p75: 32 },
    });
    const { result } = renderHook(() => useMarketPE(10));
    expect(result.current.loading).toBe(true);
  });

  it('loads market PE data successfully', async () => {
    const mockData = {
      years: 10,
      stats: { median: 25, mean: 24, min: 10, max: 40, p25: 18, p75: 32 },
    };
    vi.mocked(shillerApi.fetchMarketPE).mockResolvedValue(mockData);

    const { result } = renderHook(() => useMarketPE(10));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('transitions to error state when API fails', async () => {
    vi.mocked(shillerApi.fetchMarketPE).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMarketPE(10));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('does not update state after unmount', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let resolvePromise!: (value: { years: number; stats: { median: number; mean: number; min: number; max: number; p25: number; p75: number } }) => void;
    const deferred = new Promise<{ years: number; stats: { median: number; mean: number; min: number; max: number; p25: number; p75: number } }>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(shillerApi.fetchMarketPE).mockReturnValue(deferred);

    const { unmount } = renderHook(() => useMarketPE(10));
    unmount();

    resolvePromise({ years: 10, stats: { median: 25, mean: 24, min: 10, max: 40, p25: 18, p75: 32 } });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
