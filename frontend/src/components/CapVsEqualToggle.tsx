// src/components/CapVsEqualToggle.tsx
import './CapVsEqualToggle.css';

interface CapVsEqualToggleProps {
  mode: 'cap-weighted' | 'equal-weight';
  onChange: (mode: 'cap-weighted' | 'equal-weight') => void;
}

export default function CapVsEqualToggle({ mode, onChange }: CapVsEqualToggleProps) {
  return (
    <div className="mode-toggle">
      <label>Display Mode:</label>
      <div className="toggle-buttons">
        <button
          className={`toggle-btn ${mode === 'cap-weighted' ? 'active' : ''}`}
          onClick={() => onChange('cap-weighted')}
        >
          Cap-Weighted
        </button>
        <button
          className={`toggle-btn ${mode === 'equal-weight' ? 'active' : ''}`}
          onClick={() => onChange('equal-weight')}
        >
          Equal-Weight
        </button>
      </div>
    </div>
  );
}
