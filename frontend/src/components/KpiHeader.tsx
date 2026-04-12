import { useMemo } from 'react';
import { Card, Grid, Metric, Text, BadgeDelta, Flex } from '@tremor/react';
import { useMarketPE } from '../hooks/useMarketPE';
import { useLatestMarketPE } from '../hooks/useLatestMarketPE';
import { SectorMetric } from '../types';

interface KpiHeaderProps {
  sectors: SectorMetric[];
}

function getDeltaType(value: number): 'increase' | 'moderateIncrease' | 'unchanged' | 'moderateDecrease' | 'decrease' {
  if (value > 20) return 'increase';
  if (value > 5) return 'moderateIncrease';
  if (value > -5) return 'unchanged';
  if (value > -20) return 'moderateDecrease';
  return 'decrease';
}

export default function KpiHeader({ sectors }: KpiHeaderProps) {
  const { data: peData, loading: peLoading } = useMarketPE(10);
  const { latestCape, loading: capeLoading } = useLatestMarketPE();

  const hottestSector = useMemo(() => {
    if (!sectors.length) return null;
    return sectors.reduce((prev, curr) =>
      curr.weightedPeRatio > prev.weightedPeRatio ? curr : prev
    );
  }, [sectors]);

  const spreadPct = useMemo(() => {
    if (!latestCape || !peData) return null;
    const median = peData.stats.median;
    return ((latestCape - median) / median) * 100;
  }, [latestCape, peData]);

  const isLoading = peLoading || capeLoading;

  return (
    <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-4 mb-6">
      {/* Card 1: Current CAPE */}
      <Card decoration="top" decorationColor="blue">
        <Text>Shiller CAPE (Current)</Text>
        <Metric className="mt-1">
          {isLoading ? '—' : latestCape !== null ? latestCape.toFixed(1) : '—'}
        </Metric>
        <Text className="mt-1 text-tremor-content-subtle">10-Year Rolling Average</Text>
        {!isLoading && latestCape !== null && peData && (
          <Flex className="mt-2" justifyContent="start">
            <BadgeDelta deltaType={latestCape > peData.stats.median ? 'increase' : 'decrease'}>
              vs {peData.stats.median.toFixed(1)} median
            </BadgeDelta>
          </Flex>
        )}
      </Card>

      {/* Card 2: 10-Year Median */}
      <Card decoration="top" decorationColor="indigo">
        <Text>10-Year Historical Median</Text>
        <Metric className="mt-1">
          {peLoading ? '—' : peData ? peData.stats.median.toFixed(1) : '—'}
        </Metric>
        <Text className="mt-1 text-tremor-content-subtle">Shiller P/E Median</Text>
        {!peLoading && peData && (
          <Flex className="mt-2" justifyContent="start">
            <BadgeDelta deltaType="unchanged">
              range {peData.stats.min.toFixed(1)}–{peData.stats.max.toFixed(1)}
            </BadgeDelta>
          </Flex>
        )}
      </Card>

      {/* Card 3: Spread vs Median */}
      <Card decoration="top" decorationColor={
        spreadPct === null ? 'gray'
          : spreadPct > 20 ? 'red'
          : spreadPct > 5 ? 'yellow'
          : 'green'
      }>
        <Text>Spread vs 10y Median</Text>
        <Metric className="mt-1">
          {spreadPct !== null ? `${spreadPct > 0 ? '+' : ''}${spreadPct.toFixed(1)}%` : '—'}
        </Metric>
        <Text className="mt-1 text-tremor-content-subtle">
          {spreadPct === null ? 'Loading…'
            : spreadPct > 20 ? 'Significantly overvalued'
            : spreadPct > 5 ? 'Moderately overvalued'
            : spreadPct < -5 ? 'Undervalued'
            : 'Near fair value'}
        </Text>
        {spreadPct !== null && (
          <Flex className="mt-2" justifyContent="start">
            <BadgeDelta deltaType={getDeltaType(spreadPct)}>
              {spreadPct > 0 ? 'Above' : 'Below'} historical median
            </BadgeDelta>
          </Flex>
        )}
      </Card>

      {/* Card 4: Hottest Sector */}
      <Card decoration="top" decorationColor="orange">
        <Text>Hottest Sector (P/E)</Text>
        <Metric className="mt-1">
          {hottestSector ? hottestSector.sector.split(' ')[0] : '—'}
        </Metric>
        <Text className="mt-1 text-tremor-content-subtle">
          {hottestSector ? hottestSector.sector : 'No data'}
        </Text>
        {hottestSector && (
          <Flex className="mt-2" justifyContent="start">
            <BadgeDelta deltaType="increase">
              P/E {hottestSector.weightedPeRatio.toFixed(1)}
            </BadgeDelta>
          </Flex>
        )}
      </Card>
    </Grid>
  );
}
