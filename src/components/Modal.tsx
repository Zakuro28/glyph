import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'

const EASE = [0.23, 1, 0.32, 1] as const

/** A centered dialog: Escape or a click outside closes it */
export default function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-bg/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            className={`relative w-full rounded-3xl bg-panel p-6 shadow-2xl ring-1 ring-line sm:p-8 ${wide ? 'max-w-lg' : 'max-w-md'}`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ duration: 0.28, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={onClose} aria-label="Close" className="press absolute top-4 right-4 grid size-9 place-items-center rounded-full text-sub hover:bg-raise hover:text-text">
              <X className="size-4" />
            </button>
            <h2 className="pr-10 text-lg font-semibold">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
