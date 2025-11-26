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
  radius?: number; // Radius of the circle (in pixels)
}

export function WheelLEDLights({ count = 24, radius = 260 }: WheelLEDLightsProps) {
  const [activePattern, setActivePattern] = useState(0);

  useEffect(() => {
    // Change pattern every 500ms for animated effect
    const interval = setInterval(() => {
      setActivePattern((prev) => (prev + 1) % LED_COLORS.length);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const lights = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    // Determine color based on position and active pattern
    const colorIndex = (i + activePattern) % LED_COLORS.length;
    const color = LED_COLORS[colorIndex];

    return { x, y, color, index: i };
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        {lights.map((light) => (
          <motion.div
            key={light.index}
            className="absolute rounded-full"
            style={{
              width: '12px',
              height: '12px',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${light.x}px, ${light.y}px)`,
              backgroundColor: light.color,
              boxShadow: `0 0 10px ${light.color}, 0 0 20px ${light.color}, 0 0 30px ${light.color}`,
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: light.index * 0.05, // Stagger animation
            }}
          />
        ))}
      </div>
    </div>
  );
}
