import { useRef } from 'react'
import { motion } from 'framer-motion'
import { WheelLEDLights } from './WheelLEDLights'
import { useViewTheme } from './ViewThemeProvider'

interface SpinWheelProps {
  items: { id: string; text: string; color: string; visible: boolean }[]
  isSpinning: boolean
  spinDuration: number
  rotation: number
}

export default function SpinWheel({ items, isSpinning, spinDuration, rotation }: SpinWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const { viewTheme } = useViewTheme()

  // Filter only visible items
  const visibleItems = items.filter(item => item.visible)

  if (visibleItems.length === 0) {
    return (
      <div className="flex items-center justify-center w-full aspect-square max-w-[500px] mx-auto bg-muted/20 rounded-full">
        <p className="text-muted-foreground text-sm sm:text-lg md:text-xl text-center px-4">
          Add items to start spinning!
        </p>
      </div>
    )
  }

  const segmentAngle = 360 / visibleItems.length

  return (
    <div className="relative flex items-center justify-center w-full max-w-[500px] mx-auto">
      {/* LED Lights - Only show for Christmas theme */}
      {viewTheme === 'christmas' && (
        <WheelLEDLights count={24} />
      )}

      {/* Pointer/Arrow at top - responsive size */}
      <div className="absolute top-0 z-20 -translate-y-1/2">
        <div className="w-0 h-0
          border-l-[12px] border-l-transparent
          border-r-[12px] border-r-transparent
          border-t-[24px] border-t-red-500
          sm:border-l-[16px] sm:border-r-[16px] sm:border-t-[32px]
          md:border-l-[20px] md:border-r-[20px] md:border-t-[40px]
          drop-shadow-lg"
        />
      </div>

      {/* Wheel Container */}
      <motion.div
        ref={wheelRef}
        className="relative w-full"
        animate={{ rotate: rotation }}
        transition={{
          duration: isSpinning ? spinDuration : 0,
          ease: isSpinning ? [0.25, 0.1, 0.25, 1] : 'linear'
        }}
      >
        <svg
          viewBox="0 0 500 500"
          className="w-full h-auto drop-shadow-2xl"
        >
          {/* Outer circle border */}
          <circle
            cx="250"
            cy="250"
            r="245"
            fill="none"
            stroke="white"
            strokeWidth="5"
          />

          {/* Draw each segment */}
          {visibleItems.map((item, index) => {
            // Special case: if there's only one segment, draw a full circle
            if (visibleItems.length === 1) {
              return (
                <g key={item.id}>
                  {/* Full circle segment */}
                  <circle
                    cx="250"
                    cy="250"
                    r="240"
                    fill={item.color}
                    stroke="white"
                    strokeWidth="2"
                  />

                  {/* Text at top center - not overlapping SPIN button */}
                  <text
                    x="250"
                    y="100"
                    fill="white"
                    fontSize="24"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                    }}
                  >
                    {item.text}
                  </text>
                </g>
              )
            }

            const startAngle = (index * segmentAngle - 90) * (Math.PI / 180)
            const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180)
            const midAngle = (startAngle + endAngle) / 2

            // Calculate path for segment
            const x1 = 250 + 240 * Math.cos(startAngle)
            const y1 = 250 + 240 * Math.sin(startAngle)
            const x2 = 250 + 240 * Math.cos(endAngle)
            const y2 = 250 + 240 * Math.sin(endAngle)

            const largeArc = segmentAngle > 180 ? 1 : 0
            const path = `M 250 250 L ${x1} ${y1} A 240 240 0 ${largeArc} 1 ${x2} ${y2} Z`

            // Calculate text position
            const textRadius = 160
            const textX = 250 + textRadius * Math.cos(midAngle)
            const textY = 250 + textRadius * Math.sin(midAngle)
            const textAngle = (midAngle * 180) / Math.PI + 90

            return (
              <g key={item.id}>
                {/* Segment */}
                <path
                  d={path}
                  fill={item.color}
                  stroke="white"
                  strokeWidth="2"
                />

                {/* Text */}
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="18"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                  className="pointer-events-none select-none"
                  style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                  }}
                >
                  {item.text}
                </text>
              </g>
            )
          })}

          {/* Center circle - SPIN button */}
          <circle
            cx="250"
            cy="250"
            r="50"
            fill="white"
            stroke="#333"
            strokeWidth="3"
          />
          <text
            x="250"
            y="250"
            fill="#333"
            fontSize="24"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            SPIN
          </text>
        </svg>
      </motion.div>
    </div>
  )
}
