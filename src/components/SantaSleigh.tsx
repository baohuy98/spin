import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SantaPosition {
  id: number;
  startY: number;
  direction: 'left-to-right' | 'right-to-left';
}

export function SantaSleigh() {
  const [santas, setSantas] = useState<SantaPosition[]>([]);
  const [santaCounter, setSantaCounter] = useState(0);
  const MAX_SANTAS = 1; // Only allow 1 Santa on screen at a time

  useEffect(() => {
    // Function to create a new Santa
    const createSanta = () => {
      // Only create new Santa if we haven't reached the limit
      setSantas((prev) => {
        if (prev.length >= MAX_SANTAS) {
          return prev; // Don't add more if at limit
        }

        const direction = Math.random() > 0.5 ? 'left-to-right' : 'right-to-left';
        const startY = Math.random() * 60 + 10; // Random Y position between 10% and 70% of screen

        const newSanta: SantaPosition = {
          id: santaCounter,
          startY,
          direction,
        };

        // Remove Santa after animation completes
        setTimeout(() => {
          setSantas((current) => current.filter((s) => s.id !== newSanta.id));
        }, 12500); // Animation duration is 12s, plus 0.5s buffer

        return [...prev, newSanta];
      });

      setSantaCounter((prev) => prev + 1);
    };

    // Create first Santa after a short delay
    const initialTimeout = setTimeout(createSanta, 2000);

    // Then create a new Santa every 15-20 seconds
    const interval = setInterval(() => {
      createSanta();
    }, Math.random() * 5000 + 15000); // Between 15-20 seconds

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [santaCounter]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {santas.map((santa) => {
          const isLeftToRight = santa.direction === 'left-to-right';

          return (
            <motion.div
              key={santa.id}
              className="absolute"
              style={{
                top: `${santa.startY}%`,
                left: isLeftToRight ? '-15%' : '115%',
              }}
              initial={{
                x: 0,
                opacity: 0,
              }}
              animate={{
                x: isLeftToRight ? '130vw' : '-130vw',
                opacity: [0, 1, 1, 1, 0],
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 12,
                ease: 'linear',
                opacity: {
                  times: [0, 0.1, 0.9, 1],
                  duration: 12,
                },
              }}
            >
              <div
                className="text-8xl"
                style={{
                  transform: isLeftToRight ? 'scaleX(1)' : 'scaleX(-1)',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                }}
              >
                🎅🦌
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
