import { useEffect } from 'react'
import { useStored } from './storage'

/** Seconds spent on a puzzle, saved as it goes. Only ticks while running and while the tab is in view. */
export function useTimer(key: string, running: boolean) {
  const [seconds, setSeconds] = useStored<number>(key, 0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [running, setSeconds])
  return [seconds, setSeconds] as const
}
