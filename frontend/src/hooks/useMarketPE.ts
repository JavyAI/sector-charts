import { useState, useEffect } from 'react';
import { fetchMarketPE, MarketPEResponse } from '../services/shillerApi';

export function useMarketPE(years: number = 10) {
  const [data, setData] = useState<MarketPEResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchMarketPE(years);
        if (isMounted) {
          setData(result);
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
  }, [years]);

  return { data, loading, error };
}
