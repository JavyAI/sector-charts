// src/components/TimelapseControl.tsx
import { useState } from 'react';
import './TimelapseControl.css';

interface TimelapseControlProps {
  onDateChange: (date: string) => void;
  currentDate: string;
}

export default function TimelapseControl({ onDateChange, currentDate }: TimelapseControlProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepBackward = () => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    onDateChange(date.toISOString().split('T')[0]);
  };

  const handleStepForward = () => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + 1);
    onDateChange(date.toISOString().split('T')[0]);
  };

  return (
    <div className="timelapse-control">
      <label>Time-Lapse:</label>
      <div className="controls">
        <button onClick={handleStepBackward} title="Previous day">
          ⏮ Back
        </button>
        <button onClick={handlePlayPause} className={isPlaying ? 'playing' : ''}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={handleStepForward} title="Next day">
          Forward ⏭
        </button>
      </div>
    </div>
  );
}
