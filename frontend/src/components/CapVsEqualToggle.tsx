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
          type="button"
          className={`toggle-btn ${mode === 'cap-weighted' ? 'active' : ''}`}
          onClick={() => onChange('cap-weighted')}
          aria-pressed={mode === 'cap-weighted'}
        >
          Cap-Weighted
        </button>
        <button
          type="button"
          className={`toggle-btn ${mode === 'equal-weight' ? 'active' : ''}`}
          onClick={() => onChange('equal-weight')}
          aria-pressed={mode === 'equal-weight'}
        >
          Equal-Weight
        </button>
      </div>
    </div>
  );
}
