import { Card, Title, Metric, Text, Grid, Col, Flex } from '@tremor/react';
import { useMarketPE } from '../hooks/useMarketPE';

interface MarketContextCardProps {
  years?: number;
}

export function MarketContextCard({ years = 10 }: MarketContextCardProps) {
  const { data, loading, error } = useMarketPE(years);

  if (loading) {
    return (
      <Card className="mb-4">
        <Title>Market P/E Context</Title>
        <Text className="mt-2 text-tremor-content-subtle">Loading historical data…</Text>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="mb-4">
        <Title>Market P/E Context</Title>
        <Text className="mt-2 text-tremor-content-emphasis">Unable to load Shiller data: {error ?? 'no data'}</Text>
      </Card>
    );
  }

  const { stats } = data;
  const range = `${stats.min.toFixed(1)} – ${stats.max.toFixed(1)}`;

  return (
    <Card className="mb-4">
      <Title>Market P/E — Last {years} Years (Shiller)</Title>
      <Grid numItems={2} numItemsSm={3} numItemsLg={5} className="mt-4 gap-4">
        <StatCell label="Median" value={stats.median.toFixed(1)} />
        <StatCell label="Mean" value={stats.mean.toFixed(1)} />
        <StatCell label="P25" value={stats.p25.toFixed(1)} />
        <StatCell label="P75" value={stats.p75.toFixed(1)} />
        <StatCell label="Range" value={range} />
      </Grid>
    </Card>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <Col>
      <Flex flexDirection="col" alignItems="center">
        <Text className="uppercase tracking-wide text-xs text-tremor-content-subtle">{label}</Text>
        <Metric className="text-xl">{value}</Metric>
      </Flex>
    </Col>
  );
}
