import { useState, useEffect } from 'react';
import { fetchSectorData } from '../services/api';
import { SectorDataResponse } from '../types';

export function useSectorData(date: string) {
  const [data, setData] = useState<SectorDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchSectorData(date);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch sector data'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [date]);

  return { data, loading, error };
}
