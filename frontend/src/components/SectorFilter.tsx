import { Flex, MultiSelect, MultiSelectItem, Text } from '@tremor/react';
import { SectorMetric } from '../types';

interface SectorFilterProps {
  sectors: SectorMetric[];
  visibleSectors: Set<string>;
  onChange: (visible: Set<string>) => void;
}

export default function SectorFilter({ sectors, visibleSectors, onChange }: SectorFilterProps) {
  const selected = Array.from(visibleSectors);

  const handleChange = (values: string[]) => {
    onChange(new Set(values));
  };

  return (
    <Flex alignItems="center" className="gap-2">
      <Text className="font-medium whitespace-nowrap">Sectors:</Text>
      <MultiSelect
        value={selected}
        onValueChange={handleChange}
        placeholder="Select sectors…"
        className="w-72"
      >
        {sectors.map((s) => (
          <MultiSelectItem key={s.sector} value={s.sector}>
            {s.sector}
          </MultiSelectItem>
        ))}
      </MultiSelect>
    </Flex>
  );
}
