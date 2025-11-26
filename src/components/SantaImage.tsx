import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import santaImage from '../assets/christmas-santa-claus-png.png';

interface SantaInstance {
  id: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;
}

export function SantaImage() {
  const [santas, setSantas] = useState<SantaInstance[]>([]);
  const [santaCounter, setSantaCounter] = useState(0);
  const MAX_SANTAS = 1; // Only one Santa at a time

  useEffect(() => {
    const createSanta = () => {
      setSantas((prev) => {
        if (prev.length >= MAX_SANTAS) {
          return prev;
        }

        // Random corner position
        const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
        ];
        const randomPosition = positions[Math.floor(Math.random() * positions.length)];

        // Random size between 100-200px
        const randomSize = Math.floor(Math.random() * 100) + 100;

        const newSanta: SantaInstance = {
          id: santaCounter,
          position: randomPosition,
          size: randomSize,
        };

        // Remove Santa after animation completes
        setTimeout(() => {
          setSantas((current) => current.filter((s) => s.id !== newSanta.id));
        }, 5000); // Total duration: slide in (1s) + stay (3s) + slide out (1s)

        return [...prev, newSanta];
      });

      setSantaCounter((prev) => prev + 1);
    };

    // Create first Santa after 3 seconds
    const initialTimeout = setTimeout(createSanta, 3000);

    // Create new Santa every 10-15 seconds
    const interval = setInterval(() => {
      createSanta();
    }, Math.random() * 5000 + 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [santaCounter]);

  const getPositionStyles = (position: string) => {
    switch (position) {
      case 'top-left':
        return { top: '10%', left: '5%' };
      case 'top-right':
        return { top: '10%', right: '5%' };
      case 'bottom-left':
        return { bottom: '10%', left: '5%' };
      case 'bottom-right':
        return { bottom: '10%', right: '5%' };
      default:
        return { top: '10%', left: '5%' };
    }
  };

  const getSlideVariants = (position: string) => {
    switch (position) {
      case 'top-left':
        return {
          initial: { x: -300, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: -300, opacity: 0 },
        };
      case 'top-right':
        return {
          initial: { x: 300, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: 300, opacity: 0 },
        };
      case 'bottom-left':
        return {
          initial: { x: -300, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: -300, opacity: 0 },
        };
      case 'bottom-right':
        return {
          initial: { x: 300, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: 300, opacity: 0 },
        };
      default:
        return {
          initial: { x: -300, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: -300, opacity: 0 },
        };
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {santas.map((santa) => {
          const variants = getSlideVariants(santa.position);

          return (
            <motion.div
              key={santa.id}
              className="absolute"
              style={getPositionStyles(santa.position)}
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{
                duration: 1,
                ease: 'easeInOut',
              }}
            >
              <motion.img
                src={santaImage}
                alt="Santa Claus"
                style={{
                  width: `${santa.size}px`,
                  height: 'auto',
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
                }}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
