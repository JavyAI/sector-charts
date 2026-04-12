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
        // Fetch recent 2 years to get the latest data point
        const end = todayLocal();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
        const start = formatLocalDate(startDate);

        const result = await fetchShillerHistory(start, end);
        if (isMounted) {
          const points: ShillerHistoryPoint[] = result.data ?? [];
          if (points.length > 0) {
            const last = points[points.length - 1];
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
