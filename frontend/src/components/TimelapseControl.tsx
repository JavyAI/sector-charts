import { useState, useEffect, useRef } from 'react';
import { Button, Flex, Text } from '@tremor/react';
import { formatLocalDate, todayLocal } from '../utils/date';

interface TimelapseControlProps {
  onDateChange: (date: string) => void;
  currentDate: string;
}

export default function TimelapseControl({ onDateChange, currentDate }: TimelapseControlProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentDateRef = useRef(currentDate);
  const onDateChangeRef = useRef(onDateChange);

  // Keep refs in sync so the interval callback always reads the latest values
  useEffect(() => { currentDateRef.current = currentDate; }, [currentDate]);
  useEffect(() => { onDateChangeRef.current = onDateChange; }, [onDateChange]);

  useEffect(() => {
    if (!isPlaying) return;

    const today = todayLocal();

    // Already at today — don't start
    if (currentDateRef.current >= today) {
      setIsPlaying(false);
      return;
    }

    const tick = () => {
      const current = currentDateRef.current;
      const d = new Date(current + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const next = formatLocalDate(d);
      if (next > todayLocal()) {
        setIsPlaying(false);
        return;
      }
      onDateChangeRef.current(next);
      if (next >= todayLocal()) setIsPlaying(false);
    };

    const intervalId = setInterval(tick, 800);
    return () => clearInterval(intervalId);
  }, [isPlaying]); // depends ONLY on isPlaying

  const stepBack = () => {
    setIsPlaying(false);
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    onDateChange(formatLocalDate(d));
  };

  const stepForward = () => {
    setIsPlaying(false);
    const today = todayLocal();
    if (currentDate >= today) return;
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    onDateChange(formatLocalDate(d));
  };

  return (
    <Flex flexDirection="row" alignItems="center" className="gap-2">
      <Text className="text-tremor-content">Time-Lapse:</Text>
      <Button size="xs" variant="secondary" onClick={stepBack}>⏮ Back</Button>
      <Button size="xs" variant={isPlaying ? 'primary' : 'secondary'} onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </Button>
      <Button size="xs" variant="secondary" onClick={stepForward}>Forward ⏭</Button>
    </Flex>
  );
}
