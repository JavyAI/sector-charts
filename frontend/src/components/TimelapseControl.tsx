import { useState, useEffect } from 'react';
import { Button, Flex, Text } from '@tremor/react';

interface TimelapseControlProps {
  onDateChange: (date: string) => void;
  currentDate: string;
}

export default function TimelapseControl({ onDateChange, currentDate }: TimelapseControlProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const today = new Date().toISOString().split('T')[0];
    if (currentDate >= today) {
      setIsPlaying(false);
      return;
    }

    const intervalId = setInterval(() => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + 1);
      const nextDay = date.toISOString().split('T')[0];
      const todayCheck = new Date().toISOString().split('T')[0];
      if (nextDay >= todayCheck) {
        setIsPlaying(false);
      }
      onDateChange(nextDay);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isPlaying, currentDate, onDateChange]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    onDateChange(date.toISOString().split('T')[0]);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    const date = new Date(currentDate);
    date.setDate(date.getDate() + 1);
    onDateChange(date.toISOString().split('T')[0]);
  };

  return (
    <Flex className="gap-2 items-center" justifyContent="start">
      <Text className="text-sm font-medium whitespace-nowrap">Time-Lapse:</Text>
      <Button
        size="xs"
        variant="secondary"
        onClick={handleStepBackward}
        title="Previous day"
      >
        ⏮ Back
      </Button>
      <Button
        size="xs"
        variant={isPlaying ? 'primary' : 'secondary'}
        onClick={handlePlayPause}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </Button>
      <Button
        size="xs"
        variant="secondary"
        onClick={handleStepForward}
        title="Next day"
      >
        Forward ⏭
      </Button>
    </Flex>
  );
}
