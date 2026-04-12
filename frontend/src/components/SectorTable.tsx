import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title,
  Text,
} from '@tremor/react';
import { SectorMetric } from '../types';

interface SectorTableProps {
  sectors: SectorMetric[];
}

type SortKey = 'sector' | 'weightedPeRatio' | 'equalWeightPeRatio' | 'weightedMarketCap' | 'constituents';
type SortDir = 'asc' | 'desc';

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  return `$${(cap / 1e6).toFixed(1)}M`;
}

export default function SectorTable({ sectors }: SectorTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('weightedPeRatio');
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
    return [...sectors].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === 'asc' ? an - bn : bn - an;
    });
  }, [sectors, sortKey, sortDir]);

  const arrow = (key: SortKey) => {
    if (key !== sortKey) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const headerClass = 'cursor-pointer select-none hover:text-tremor-content-strong';

  return (
    <Card className="mt-6">
      <Title>Sector Comparison Table</Title>
      <Table className="mt-4">
        <TableHead>
          <TableRow>
            <TableHeaderCell className={headerClass} onClick={() => handleSort('sector')}>
              Sector{arrow('sector')}
            </TableHeaderCell>
            <TableHeaderCell className={headerClass} onClick={() => handleSort('weightedPeRatio')}>
              Cap-Weighted P/E{arrow('weightedPeRatio')}
            </TableHeaderCell>
            <TableHeaderCell className={headerClass} onClick={() => handleSort('equalWeightPeRatio')}>
              Equal-Weight P/E{arrow('equalWeightPeRatio')}
            </TableHeaderCell>
            <TableHeaderCell className={headerClass} onClick={() => handleSort('weightedMarketCap')}>
              Market Cap{arrow('weightedMarketCap')}
            </TableHeaderCell>
            <TableHeaderCell className={headerClass} onClick={() => handleSort('constituents')}>
              Constituents{arrow('constituents')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((sector) => (
            <TableRow key={sector.sector}>
              <TableCell>
                <Text className="font-medium">{sector.sector}</Text>
              </TableCell>
              <TableCell>
                <Text>{sector.weightedPeRatio.toFixed(1)}</Text>
              </TableCell>
              <TableCell>
                <Text>{sector.equalWeightPeRatio.toFixed(1)}</Text>
              </TableCell>
              <TableCell>
                <Text>{formatMarketCap(sector.weightedMarketCap)}</Text>
              </TableCell>
              <TableCell>
                <Text>{sector.constituents}</Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
