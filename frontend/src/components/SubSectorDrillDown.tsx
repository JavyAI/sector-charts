import { useEffect, useState } from 'react';
import { fetchSubSectors, SubSectorsResponse } from '../services/api';

interface SubSectorDrillDownProps {
  sector: string | null;
  onClose: () => void;
}

export default function SubSectorDrillDown({ sector, onClose }: SubSectorDrillDownProps) {
  const [data, setData] = useState<SubSectorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sector) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchSubSectors(sector)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load sub-sectors'))
      .finally(() => setLoading(false));
  }, [sector]);

  if (!sector) return null;

  const maxCount = data ? Math.max(...data.subIndustries.map((s) => s.count), 1) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{sector}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sub-Industry Breakdown</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none font-light"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {loading && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading sub-industries...</p>
          )}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {data && !loading && (
            <>
              {/* Bar list by sub-industry */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Sub-Industries ({data.subIndustries.length})
                </h3>
                <div className="space-y-2">
                  {data.subIndustries.map((sub) => (
                    <div key={sub.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                          {sub.name}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                          {sub.count}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(sub.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constituent table */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  All Constituents ({data.subIndustries.reduce((n, s) => n + s.count, 0)})
                </h3>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-600 dark:text-gray-400">Symbol</th>
                        <th className="text-left py-1.5 font-semibold text-gray-600 dark:text-gray-400">Sub-Industry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.subIndustries.flatMap((sub) =>
                        sub.constituents.map((symbol) => (
                          <tr
                            key={symbol}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="py-1.5 pr-3 font-mono font-semibold text-gray-900 dark:text-gray-100">
                              {symbol}
                            </td>
                            <td className="py-1.5 text-gray-500 dark:text-gray-400">{sub.name}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
