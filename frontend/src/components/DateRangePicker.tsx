// src/components/DateRangePicker.tsx
import './DateRangePicker.css';

interface DateRangePickerProps {
  value: string;
  onChange: (date: string) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="date-picker">
      <label htmlFor="date-input">Select Date:</label>
      <input
        id="date-input"
        type="date"
        value={value}
        onChange={handleChange}
        max={new Date().toISOString().split('T')[0]}
      />
    </div>
  );
}
