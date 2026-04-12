import { useMemo } from 'react';
import { BarList, Badge, Grid, Col } from '@tremor/react';
import { SectorMetric } from '../types';

interface SectorVsExSectorTremorProps {
  sectors: SectorMetric[];
}

export default function SectorVsExSectorTremor({ sectors }: SectorVsExSectorTremorProps) {
  const sectorData = useMemo(() => {
    // Same ex-sector P/E computation as SVG version
    const totalMarketCap = sectors.reduce((s, x) => s + x.weightedMarketCap, 0);
    const totalEarnings = sectors.reduce((s, x) => s + x.weightedMarketCap / x.weightedPeRatio, 0);

    return sectors
      .map(s => {
        const exCap = totalMarketCap - s.weightedMarketCap;
        const exEarnings = totalEarnings - s.weightedMarketCap / s.weightedPeRatio;
        const exSectorPE = exCap / exEarnings;
        return {
          sector: s.sector,
          sectorPE: s.weightedPeRatio,
          exSectorPE,
        };
      })
      .sort((a, b) => b.sectorPE - a.sectorPE);
  }, [sectors]);

  const sectorBarData = sectorData.map(d => ({
    name: d.sector,
    value: parseFloat(d.sectorPE.toFixed(1)),
  }));

  const exSectorBarData = sectorData.map(d => ({
    name: d.sector,
    value: parseFloat(d.exSectorPE.toFixed(1)),
  }));

  return (
    <div className="w-full">
      <Grid numItems={2} className="gap-6">
        <Col>
          <div className="flex items-center gap-2 mb-3">
            <Badge color="teal">S&P 500 Sector</Badge>
          </div>
          <BarList
            data={sectorBarData}
            color="teal"
            valueFormatter={(v: number) => `${v.toFixed(1)}x`}
          />
        </Col>
        <Col>
          <div className="flex items-center gap-2 mb-3">
            <Badge color="violet">S&P 500 Ex-Sector</Badge>
          </div>
          <BarList
            data={exSectorBarData}
            color="violet"
            valueFormatter={(v: number) => `${v.toFixed(1)}x`}
          />
        </Col>
      </Grid>
    </div>
  );
}
