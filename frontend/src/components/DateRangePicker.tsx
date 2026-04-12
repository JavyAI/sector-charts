import { DatePicker, Flex, Text } from '@tremor/react';
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
    <Flex alignItems="center" className="gap-2">
      <Text className="font-medium whitespace-nowrap">Select Date:</Text>
      <DatePicker
        value={dateValue}
        onValueChange={handleChange}
        maxDate={maxDate}
        className="w-44"
      />
    </Flex>
  );
}
