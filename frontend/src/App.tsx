import { useState, useEffect, useRef } from 'react';
import { Callout, Flex, Grid, Title, Subtitle } from '@tremor/react';
import SectorChart from './components/SectorChart';
import DateRangePicker from './components/DateRangePicker';
import TimelapseControl from './components/TimelapseControl';
import SectorFilter from './components/SectorFilter';
import CapVsEqualToggle from './components/CapVsEqualToggle';
import { MarketContextCard } from './components/MarketContextCard';
import KpiHeader from './components/KpiHeader';
import SectorAllocation from './components/SectorAllocation';
import SectorTable from './components/SectorTable';
import DarkModeToggle from './components/DarkModeToggle';
import { useSectorData } from './hooks/useSectorData';
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
  const { data, loading, error } = useSectorData(selectedDate);
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
        <div className="bg-tremor-background-subtle dark:bg-dark-tremor-background-subtle rounded-tremor-default p-4 mb-6">
          <Flex flexDirection="row" justifyContent="start" className="gap-4 flex-wrap">
            <DateRangePicker value={selectedDate} onChange={setSelectedDate} />
            <CapVsEqualToggle mode={displayMode} onChange={setDisplayMode} />
            <TimelapseControl onDateChange={setSelectedDate} currentDate={selectedDate} />
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
        </div>

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
                />
              </div>
              <div className="flex flex-col gap-4">
                <SectorAllocation sectors={data.sectors} />
                <MarketContextCard years={10} />
              </div>
            </Grid>

            {/* Full-width Sector Table */}
            <SectorTable sectors={data.sectors} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
