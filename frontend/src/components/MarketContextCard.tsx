import { useMarketPE } from '../hooks/useMarketPE';

interface MarketContextCardProps {
  years?: number;
}

export function MarketContextCard({ years = 10 }: MarketContextCardProps) {
  const { data, loading, error } = useMarketPE(years);

  if (loading) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Market P/E Context</h3>
        <p style={{ color: '#888' }}>Loading historical data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Market P/E Context</h3>
        <p style={{ color: '#c00' }}>Unable to load Shiller data: {error || 'no data'}</p>
      </div>
    );
  }

  const { stats } = data;
  const range = `${stats.min.toFixed(1)} – ${stats.max.toFixed(1)}`;

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Market P/E — Last {years} Years (Shiller)</h3>
      <div style={gridStyle}>
        <Stat label="Median" value={stats.median.toFixed(1)} />
        <Stat label="Mean" value={stats.mean.toFixed(1)} />
        <Stat label="P25" value={stats.p25.toFixed(1)} />
        <Stat label="P75" value={stats.p75.toFixed(1)} />
        <Stat label="Range" value={range} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#222' }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  margin: '0 0 1rem 0',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  background: '#fafafa',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 0.75rem 0',
  fontSize: '1rem',
  fontWeight: 600,
  color: '#333',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '0.75rem',
};
