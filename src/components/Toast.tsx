import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/** Short messages that drop in at the top of a game, newest first */
export function useToast() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([])
  const next = useRef(0)
  const show = useCallback((text: string, ms = 1400) => {
    const id = next.current++
    setItems((list) => [{ id, text }, ...list].slice(0, 3))
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), ms)
  }, [])

  const node = (
    <div className="pointer-events-none fixed inset-x-0 top-[8.25rem] z-40 flex flex-col items-center gap-2" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.p
            key={t.id}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-lg bg-text px-3.5 py-2 text-sm font-semibold text-bg shadow-lg"
          >
            {t.text}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  )
  return [node, show] as const
}
