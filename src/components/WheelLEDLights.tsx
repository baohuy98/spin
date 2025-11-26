import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const LED_COLORS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FF8800', // Orange
];

interface WheelLEDLightsProps {
  count?: number; // Number of LED lights around the wheel
}

export function WheelLEDLights({ count = 24 }: WheelLEDLightsProps) {
  const [activePattern, setActivePattern] = useState(0);
  const [flashPhase, setFlashPhase] = useState(0);

  useEffect(() => {
    // Change pattern every 300ms for faster flash effect
    const interval = setInterval(() => {
      setActivePattern((prev) => (prev + 1) % count);
    }, 300);

    return () => clearInterval(interval);
  }, [count]);

  useEffect(() => {
    // Flash phase for on/off effect
    const interval = setInterval(() => {
      setFlashPhase((prev) => (prev + 1) % 2);
    }, 150); // Flash every 150ms

    return () => clearInterval(interval);
  }, []);

  const lights = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2; // Start from top

    // Create a chasing pattern with alternating colors
    const colorIndex = (i + activePattern) % LED_COLORS.length;
    const color = LED_COLORS[colorIndex];

    // Determine if this light should be "on" based on flash phase and position
    const isOn = (i + flashPhase + activePattern) % 2 === 0;

    return { angle, color, index: i, isOn };
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      {lights.map((light) => {
        // Use percentage-based positioning for responsiveness
        const x = 50 + 50 * Math.cos(light.angle); // 50% radius from center
        const y = 50 + 50 * Math.sin(light.angle);

        return (
          <motion.div
            key={light.index}
            className="absolute rounded-full"
            style={{
              width: '10px',
              height: '10px',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: light.isOn ? light.color : '#333',
              boxShadow: light.isOn
                ? `0 0 10px ${light.color}, 0 0 15px ${light.color}, 0 0 20px ${light.color}`
                : 'none',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
            animate={{
              opacity: light.isOn ? 1 : 0.3,
              scale: light.isOn ? 1.2 : 0.8,
            }}
            transition={{
              duration: 0.1,
              ease: "easeInOut"
            }}
          />
        );
      })}
    </div>
  );
}
