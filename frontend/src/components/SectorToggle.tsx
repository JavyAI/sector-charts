// src/components/SectorToggle.tsx
import './SectorToggle.css';

interface SectorToggleProps {
  sector: string;
  isVisible: boolean;
  onToggle: (sector: string) => void;
}

export default function SectorToggle({ sector, isVisible, onToggle }: SectorToggleProps) {
  return (
    <button
      className={`sector-toggle ${isVisible ? 'active' : ''}`}
      onClick={() => onToggle(sector)}
    >
      {sector}
    </button>
  );
}
