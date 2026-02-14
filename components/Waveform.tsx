import React, { useState, useEffect } from 'react';

interface WaveformProps {
  isActive: boolean;
  amplitude: number;
  color?: string;
}

const Waveform: React.FC<WaveformProps> = ({ isActive, amplitude, color = 'bg-pink-500' }) => {
  const bars = 20;
  const [heights, setHeights] = useState<number[]>(Array(bars).fill(4));
  
  useEffect(() => {
    if (!isActive) {
      setHeights(Array(bars).fill(4));
      return;
    }

    const interval = setInterval(() => {
      setHeights(prev => 
        prev.map(() => {
          const baseHeight = amplitude * 80;
          const randomVariation = Math.random() * 20;
          return Math.max(8, baseHeight + randomVariation);
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, amplitude, bars]);
  
  return (
    <div className="flex items-center justify-center gap-[2px] h-12 w-full">
      {heights.map((height, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-100 ${color} ${!isActive ? 'opacity-20' : 'opacity-100'}`}
          style={{ 
            height: `${height}%`,
          }}
        />
      ))}
    </div>
  );
};

export default Waveform;