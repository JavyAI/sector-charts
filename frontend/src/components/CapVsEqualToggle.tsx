import { TabGroup, TabList, Tab } from '@tremor/react';

interface CapVsEqualToggleProps {
  mode: 'cap-weighted' | 'equal-weight';
  onChange: (mode: 'cap-weighted' | 'equal-weight') => void;
}

const MODES: Array<'cap-weighted' | 'equal-weight'> = ['cap-weighted', 'equal-weight'];
const LABELS: Record<string, string> = {
  'cap-weighted': 'Cap-Weighted',
  'equal-weight': 'Equal-Weight',
};

export default function CapVsEqualToggle({ mode, onChange }: CapVsEqualToggleProps) {
  const index = MODES.indexOf(mode);

  return (
    <TabGroup index={index} onIndexChange={(i) => onChange(MODES[i])}>
      <TabList variant="solid" className="w-fit">
        <Tab>Cap-Weighted</Tab>
        <Tab>Equal-Weight</Tab>
      </TabList>
    </TabGroup>
  );
}

// suppress unused variable warning
void LABELS;
