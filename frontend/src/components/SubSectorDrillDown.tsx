import { useState, useMemo } from 'react';
import { useSubSectorData } from '../hooks/useSubSectorData';
import { SubSectorConstituent } from '../services/api';
import SubSectorCharts from './SubSectorCharts';
import Sparkline from './Sparkline';

interface SubSectorDrillDownProps {
  sector: string | null;
  onClose: () => void;
}

type SortKey = 'symbol' | 'security' | 'subIndustry' | 'weeklyReturn' | 'closePrice';
type SortDir = 'asc' | 'desc';

function returnBg(ret: number): string {
  if (ret >= 5) return 'bg-green-900/60';
  if (ret >= 2) return 'bg-green-900/30';
  if (ret <= -5) return 'bg-red-900/60';
  if (ret <= -2) return 'bg-red-900/30';
  return '';
}

function returnColor(ret: number): string {
  if (ret > 0) return 'text-green-400';
  if (ret < 0) return 'text-red-400';
  return 'text-gray-400';
}

function fmtPrice(p: number | null): string {
  if (p === null) return '—';
  return `$${p.toFixed(2)}`;
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  return (
    <th
      className="text-left py-2 pr-3 text-xs font-semibold text-gray-400 cursor-pointer select-none hover:text-gray-200 whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {currentKey === sortKey ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

function ConstituentTable({ constituents }: { constituents: SubSectorConstituent[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('weeklyReturn');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    return [...constituents].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'symbol': av = a.symbol; bv = b.symbol; break;
        case 'security': av = a.security; bv = b.security; break;
        case 'subIndustry': av = a.subIndustry; bv = b.subIndustry; break;
        case 'weeklyReturn': av = a.weeklyReturn; bv = b.weeklyReturn; break;
        case 'closePrice': av = a.closePrice ?? -Infinity; bv = b.closePrice ?? -Infinity; break;
        default: av = 0; bv = 0;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [constituents, sortKey, sortDir]);

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs min-w-[640px]">
        <thead className="sticky top-0 bg-gray-900 z-10">
          <tr className="border-b border-gray-700">
            <SortableHeader label="Symbol" sortKey="symbol" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableHeader label="Company" sortKey="security" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableHeader label="Sub-Industry" sortKey="subIndustry" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableHeader label="Return" sortKey="weeklyReturn" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableHeader label="Price" sortKey="closePrice" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="text-left py-2 text-xs font-semibold text-gray-400">Sparkline (20d)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr
              key={c.symbol}
              className={`border-b border-gray-800 hover:bg-gray-800/40 ${returnBg(c.weeklyReturn)}`}
            >
              <td className="py-1.5 pr-3 font-mono font-bold text-gray-100">{c.symbol}</td>
              <td className="py-1.5 pr-3 text-gray-300 truncate max-w-[160px]" title={c.security}>
                {c.security}
              </td>
              <td className="py-1.5 pr-3 text-gray-400 truncate max-w-[140px]" title={c.subIndustry}>
                {c.subIndustry}
              </td>
              <td className={`py-1.5 pr-3 font-semibold ${returnColor(c.weeklyReturn)}`}>
                {c.weeklyReturn >= 0 ? '+' : ''}{c.weeklyReturn.toFixed(2)}%
              </td>
              <td className="py-1.5 pr-3 text-gray-300">{fmtPrice(c.closePrice)}</td>
              <td className="py-1.5">
                <Sparkline data={c.sparkline} width={120} height={32} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SubSectorDrillDown({ sector, onClose }: SubSectorDrillDownProps) {
  const { data, loading, error } = useSubSectorData(sector);

  if (!sector) return null;

  const totalConstituents = data?.constituents.length ?? 0;
  const withSparklines = data?.constituents.filter((c) => c.sparkline.length > 0).length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-4 pb-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-20">
          <div>
            <h2 className="text-lg font-bold text-gray-100">{sector}</h2>
            <p className="text-sm text-gray-400">
              Sub-Sector Analysis
              {data && (
                <span className="ml-2 text-gray-500">
                  · {data.subIndustries.length} sub-industries · {totalConstituents} constituents
                  {withSparklines > 0 && ` · ${withSparklines} with sparklines`}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none font-light px-2"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-8 flex-1">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <p className="text-gray-400 text-sm">Loading sub-sector data...</p>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Charts section */}
              <section>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">
                  Sub-Industry Performance
                </h3>
                <SubSectorCharts
                  subIndustries={data.subIndustries}
                  constituents={data.constituents}
                />
              </section>

              {/* Constituent table */}
              <section>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Constituents ({totalConstituents})
                </h3>
                <ConstituentTable constituents={data.constituents} />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
