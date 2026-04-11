// src/components/TimelapseControl.tsx
import { useState, useEffect } from 'react';
import './TimelapseControl.css';

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
    <div className="timelapse-control">
      <label>Time-Lapse:</label>
      <div className="controls">
        <button type="button" onClick={handleStepBackward} title="Previous day">
          ⏮ Back
        </button>
        <button type="button" onClick={handlePlayPause} className={isPlaying ? 'playing' : ''}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button type="button" onClick={handleStepForward} title="Next day">
          Forward ⏭
        </button>
      </div>
    </div>
  );
}
