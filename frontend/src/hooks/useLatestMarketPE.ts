import { useState, useEffect } from 'react';
import { fetchShillerHistory, ShillerHistoryPoint } from '../services/shillerApi';
import { formatLocalDate, todayLocal } from '../utils/date';

interface UseLatestMarketPEResult {
  latestCape: number | null;
  loading: boolean;
  error: string | null;
}

export function useLatestMarketPE(): UseLatestMarketPEResult {
  const [latestCape, setLatestCape] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch last 5 years to find latest non-zero CAPE (Shiller data can lag 1-2 years)
        const end = todayLocal();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
        const start = formatLocalDate(startDate);

        const result = await fetchShillerHistory(start, end);
        if (isMounted) {
          const points: ShillerHistoryPoint[] = result.data ?? [];
          // Find the latest point where cape is actually populated (> 0).
          // Shiller's upstream dataset lags — recent months may have cape=0.
          const validPoints = points.filter((p) => p.cape > 0);
          if (validPoints.length > 0) {
            const last = validPoints[validPoints.length - 1];
            setLatestCape(last.cape);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { latestCape, loading, error };
}
