import { useState, useEffect, useRef } from 'react';
import { Callout, Card, Flex, Grid, Title, Subtitle, Text } from '@tremor/react';
import SectorChart from './components/SectorChart';
import DateRangePicker from './components/DateRangePicker';
import SectorFilter from './components/SectorFilter';
import CapVsEqualToggle from './components/CapVsEqualToggle';
import { MarketContextCard } from './components/MarketContextCard';
import KpiHeader from './components/KpiHeader';
import SectorAllocation from './components/SectorAllocation';
import SectorTable from './components/SectorTable';
import DarkModeToggle from './components/DarkModeToggle';
import DispersionChart from './components/DispersionChart';
import PeHistoricalComparison from './components/PeHistoricalComparison';
import SectorVsExSector from './components/SectorVsExSector';
import CapVsEqualWeight from './components/CapVsEqualWeight';
import SubSectorDrillDown from './components/SubSectorDrillDown';
import { useSectorData } from './hooks/useSectorData';
import { useDispersionData } from './hooks/useDispersionData';
import { todayLocal } from './utils/date';

// Initialize dark mode from localStorage before first render
const stored = (() => {
  try { return localStorage.getItem('darkMode'); } catch { return null; }
})();
if (stored === null || stored === 'true') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

function App() {
  const [selectedDate, setSelectedDate] = useState<string>(todayLocal());
  const [visibleSectors, setVisibleSectors] = useState<Set<string>>(new Set<string>());
  const [displayMode, setDisplayMode] = useState<'cap-weighted' | 'equal-weight'>('cap-weighted');
  const [drillDownSector, setDrillDownSector] = useState<string | null>(null);
  const { data, loading, error } = useSectorData(selectedDate);
  const dispersionData = useDispersionData();
  const hasInitializedRef = useRef(false);

  // Once data loads, default all sectors visible — only run once
  useEffect(() => {
    if (data && !hasInitializedRef.current) {
      setVisibleSectors(new Set(data.sectors.map((s) => s.sector)));
      hasInitializedRef.current = true;
    }
  }, [data]);

  return (
    <div className="min-h-screen bg-tremor-background dark:bg-dark-tremor-background">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header Bar */}
        <Flex justifyContent="between" alignItems="center" className="mb-6">
          <div>
            <Title className="text-2xl font-bold">S&P 500 Sector Valuations</Title>
            <Subtitle>Live P/E Ratios vs Historical Averages</Subtitle>
          </div>
          <DarkModeToggle />
        </Flex>

        {/* KPI Row */}
        {data && <KpiHeader sectors={data.sectors} />}

        {/* Controls Panel */}
        <Card className="mb-6">
          <Flex flexDirection="row" justifyContent="start" className="gap-4 flex-wrap">
            <DateRangePicker value={selectedDate} onChange={setSelectedDate} />
            <CapVsEqualToggle mode={displayMode} onChange={setDisplayMode} />
          </Flex>

          {/* Sector Filter */}
          {data && (
            <div className="mt-3">
              <SectorFilter
                sectors={data.sectors}
                visibleSectors={visibleSectors}
                onChange={setVisibleSectors}
              />
            </div>
          )}
        </Card>

        {/* Loading / Error States */}
        {loading && (
          <Callout title="Loading" color="yellow" className="mb-4">
            Fetching sector data…
          </Callout>
        )}
        {error && (
          <Callout title="Error loading data" color="red" className="mb-4">
            {error}
          </Callout>
        )}

        {/* Main Content: Chart + Allocation side by side */}
        {data && (
          <>
            <Grid numItems={1} numItemsLg={2} className="gap-6 mb-6">
              <div>
                <SectorChart
                  data={data.sectors}
                  visibleSectors={visibleSectors}
                  displayMode={displayMode}
                  onSectorClick={setDrillDownSector}
                />
              </div>
              <div className="flex flex-col gap-4">
                <SectorAllocation sectors={data.sectors} />
                <MarketContextCard years={10} />
              </div>
            </Grid>

            {/* Full-width Sector Table */}
            <SectorTable sectors={data.sectors} onSectorClick={setDrillDownSector} />
          </>
        )}

        {/* Dispersion Chart — always shown when dispersion data is ready */}
        {!dispersionData.loading && !dispersionData.error && dispersionData.stocks.length > 0 && (
          <Card className="mt-6">
            <Title>Sector Dispersion — Constituent P/E Distribution</Title>
            <Text className="mb-4">
              Each bubble represents an S&P 500 constituent. Size = market cap, color = above/below sector average.
            </Text>
            <DispersionChart
              stocks={dispersionData.stocks}
              sectorAverages={dispersionData.sectorAverages}
              metric="pe"
            />
          </Card>
        )}
        {dispersionData.loading && (
          <Callout title="Loading dispersion data" color="yellow" className="mt-6">
            Fetching constituent data…
          </Callout>
        )}
        {dispersionData.error && (
          <Callout title="Dispersion data unavailable" color="red" className="mt-6">
            {dispersionData.error}
          </Callout>
        )}

        {/* Duality-Style Analysis */}
        {data && (
          <>
            <Card className="mt-6">
              <Title>Current P/E vs Historical Averages</Title>
              <Text className="mb-4">How each sector's current valuation compares to its 5-year and 10-year average</Text>
              <PeHistoricalComparison sectors={data.sectors} onSectorClick={setDrillDownSector} />
            </Card>

            <Grid numItems={1} numItemsLg={2} className="mt-6 gap-6">
              <Card>
                <Title>Sector vs Ex-Sector Valuations</Title>
                <Text className="mb-4">Forward P/E-Ratios: with and without each sector</Text>
                <SectorVsExSector sectors={data.sectors} onSectorClick={setDrillDownSector} />
              </Card>
              <Card>
                <Title>Cap vs Equal-Weight: How Different Is the Story?</Title>
                <Text className="mb-4">Cap-Weighted Return vs Average Stock Return</Text>
                <CapVsEqualWeight sectors={data.sectors} onSectorClick={setDrillDownSector} />
              </Card>
            </Grid>
          </>
        )}
      </div>

      {/* Sub-sector drill-down modal */}
      <SubSectorDrillDown
        sector={drillDownSector}
        onClose={() => setDrillDownSector(null)}
      />
    </div>
  );
}

export default App;
