import { useCallback, useRef } from 'react'

export function useSpinSound() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const tickIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize audio context on first use
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Play a single tick sound
  const playTick = useCallback((frequency: number = 800, duration: number = 0.05) => {
    const audioContext = getAudioContext()

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    // Quick attack and decay for a "tick" sound
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)
  }, [getAudioContext])

  // Play celebration sound
  const playWinSound = useCallback(() => {
    const audioContext = getAudioContext()

    // Play a cheerful ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6

    notes.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'

      const startTime = audioContext.currentTime + index * 0.1
      gainNode.gain.setValueAtTime(0.2, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.3)
    })
  }, [getAudioContext])

  // Start spinning sound - ticks that slow down over time
  const startSpinSound = useCallback((duration: number) => {
    // Stop any existing sound
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current)
    }

    const startTime = Date.now()
    const endTime = startTime + duration * 1000

    // Initial tick interval (fast)
    let currentInterval = 50 // ms

    const tick = () => {
      const now = Date.now()
      const progress = (now - startTime) / (endTime - startTime)

      if (progress >= 1) {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current)
          tickIntervalRef.current = null
        }
        return
      }

      // Play tick with varying frequency (higher pitch at start, lower at end)
      const frequency = 1000 - progress * 400 // 1000Hz -> 600Hz
      playTick(frequency, 0.03)

      // Calculate next interval (slows down as progress increases)
      // Uses easing function for more natural slowdown
      const easeOut = 1 - Math.pow(1 - progress, 3) // Cubic ease out
      currentInterval = 50 + easeOut * 250 // 50ms -> 300ms

      // Schedule next tick
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
      }
      tickIntervalRef.current = setTimeout(tick, currentInterval)
    }

    // Start ticking
    tick()
  }, [playTick])

  // Stop spinning sound
  const stopSpinSound = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current)
      tickIntervalRef.current = null
    }
  }, [])

  return {
    playTick,
    playWinSound,
    startSpinSound,
    stopSpinSound
  }
}
