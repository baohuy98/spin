import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface FloatingReactionProps {
    emoji: string
    id: string
    userName?: string
    onComplete: (id: string) => void
}

export default function FloatingReaction({ emoji, id, userName, onComplete }: FloatingReactionProps) {
    const [randomX] = useState(() => Math.random() * 80 - 40) // Random horizontal offset -40px to +40px
    const [randomDelay] = useState(() => Math.random() * 0.3) // Random delay 0-0.3s
    const [randomDuration] = useState(() => 2 + Math.random() * 1) // Duration 2-3s

    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete(id)
        }, (randomDuration + randomDelay) * 1000)

        return () => clearTimeout(timer)
    }, [id, onComplete, randomDuration, randomDelay])

    return (
        <motion.div
            initial={{
                y: 0,
                x: 0,
                opacity: 0,
                scale: 0
            }}
            animate={{
                y: -400, // Move up 400px
                x: randomX,
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1, 0.8]
            }}
            transition={{
                duration: randomDuration,
                delay: randomDelay,
                ease: 'easeOut',
                opacity: {
                    times: [0, 0.1, 0.7, 1],
                    duration: randomDuration
                }
            }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1"
            style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
        >
            <div className="text-5xl">{emoji}</div>
            {userName && (
                <div className="text-xs font-semibold text-white bg-black/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {userName}
                </div>
            )}
        </motion.div>
    )
}
