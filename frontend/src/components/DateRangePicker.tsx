import { DatePicker } from '@tremor/react';
import { formatLocalDate } from '../utils/date';

interface DateRangePickerProps {
  value: string;
  onChange: (date: string) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const dateValue = value ? new Date(value + 'T00:00:00') : undefined;
  const maxDate = new Date();

  const handleChange = (date: Date | undefined) => {
    if (date) {
      onChange(formatLocalDate(date));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-tremor-content-emphasis font-medium whitespace-nowrap">Select Date:</span>
      <DatePicker
        value={dateValue}
        onValueChange={handleChange}
        maxDate={maxDate}
        className="w-44"
      />
    </div>
  );
}
