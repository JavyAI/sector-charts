import { useMemo } from 'react';
import { Card, Grid, Metric, Text, BadgeDelta, Flex } from '@tremor/react';
import { useMarketPE } from '../hooks/useMarketPE';
import { useLatestMarketPE } from '../hooks/useLatestMarketPE';
import { useAdjustedCape } from '../hooks/useAdjustedCape';
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
  const { data: adjustedData, loading: adjustedLoading } = useAdjustedCape(10);

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

  const capeDiff = useMemo(() => {
    if (!adjustedData) return null;
    return adjustedData.traditionalCape - adjustedData.adjustedCape;
  }, [adjustedData]);

  const isLoading = peLoading || capeLoading;

  return (
    <Grid numItems={1} numItemsSm={2} numItemsLg={5} className="gap-4 mb-6">
      {/* Card 1: Adjusted CAPE (replaces raw CAPE) */}
      <Card decoration="top" decorationColor="blue">
        <Text>Shiller CAPE (Adjusted)</Text>
        <Metric className="mt-1">
          {adjustedLoading ? '—' : adjustedData ? adjustedData.adjustedCape.toFixed(1) : '—'}
        </Metric>
        <Text className="mt-1 text-tremor-content-subtle">
          Traditional: {isLoading ? '—' : latestCape !== null ? latestCape.toFixed(1) : adjustedData ? adjustedData.traditionalCape.toFixed(1) : '—'}
        </Text>
        {!adjustedLoading && adjustedData && capeDiff !== null && (
          <Flex className="mt-2" justifyContent="start">
            <BadgeDelta deltaType={capeDiff > 0 ? 'moderateDecrease' : capeDiff < 0 ? 'moderateIncrease' : 'unchanged'}>
              {capeDiff > 0 ? `-${capeDiff.toFixed(1)}` : `+${Math.abs(capeDiff).toFixed(1)}`} IR adj.
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

      {/* Card 5: Excess CAPE Yield */}
      <Card decoration="top" decorationColor={
        adjustedLoading || !adjustedData ? 'gray'
          : adjustedData.excessCapeYield > 2 ? 'green'
          : adjustedData.excessCapeYield > 0 ? 'yellow'
          : 'red'
      }>
        <Text>Excess CAPE Yield</Text>
        <Metric className="mt-1">
          {adjustedLoading ? '—' : adjustedData ? `${adjustedData.excessCapeYield.toFixed(2)}%` : '—'}
        </Metric>
        <Text className="mt-1 text-tremor-content-subtle">Equity premium over bonds</Text>
        {!adjustedLoading && adjustedData && (
          <Flex className="mt-2" justifyContent="start">
            <BadgeDelta deltaType={
              adjustedData.excessCapeYield > 2 ? 'decrease'
                : adjustedData.excessCapeYield > 0 ? 'unchanged'
                : 'increase'
            }>
              {adjustedData.excessCapeYield > 0 ? 'Stocks vs bonds: favorable' : 'Bonds more attractive'}
            </BadgeDelta>
          </Flex>
        )}
      </Card>
    </Grid>
  );
}
