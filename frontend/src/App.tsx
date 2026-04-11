import { useState, useEffect } from 'react';
import SectorChart from './components/SectorChart';
import DateRangePicker from './components/DateRangePicker';
import TimelapseControl from './components/TimelapseControl';
import SectorToggle from './components/SectorToggle';
import CapVsEqualToggle from './components/CapVsEqualToggle';
import { useSectorData } from './hooks/useSectorData';
import './App.css';

function App() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [visibleSectors, setVisibleSectors] = useState<Set<string>>(
    new Set(['Information Technology', 'Financials', 'Energy', 'Consumer Discretionary'])
  );
  const [displayMode, setDisplayMode] = useState<'cap-weighted' | 'equal-weight'>('cap-weighted');
  const { data, loading, error } = useSectorData(selectedDate);

  const toggleSector = (sector: string) => {
    const newVisible = new Set(visibleSectors);
    if (newVisible.has(sector)) {
      newVisible.delete(sector);
    } else {
      newVisible.add(sector);
    }
    setVisibleSectors(newVisible);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>S&P 500 Sector Valuations</h1>
        <p>Live P/E Ratios vs Historical Averages</p>
      </header>

      <div className="controls-panel">
        <DateRangePicker value={selectedDate} onChange={setSelectedDate} />
        <CapVsEqualToggle
          mode={displayMode}
          onChange={setDisplayMode}
        />
        <TimelapseControl
          onDateChange={setSelectedDate}
          currentDate={selectedDate}
        />
      </div>

      <div className="sectors-toggle">
        {data?.sectors.map((sector) => (
          <SectorToggle
            key={sector.sector}
            sector={sector.sector}
            isVisible={visibleSectors.has(sector.sector)}
            onToggle={toggleSector}
          />
        ))}
      </div>

      {loading && <div className="loading">Loading data...</div>}
      {error && <div className="error">Error: {error}</div>}
      {data && (
        <SectorChart
          data={data.sectors}
          visibleSectors={visibleSectors}
          displayMode={displayMode}
        />
      )}
    </div>
  );
}

export default App;
