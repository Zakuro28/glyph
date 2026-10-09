import { useState } from 'react'
import { Copy, Image, Share2 } from 'lucide-react'
import { download, renderCard, type CardInput } from '../lib/card'

/** Copy the result as text, save it as an image, or hand it to the phone's share sheet */
export default function ShareBar({ text, card, file, onDone }: { text: string; card: () => CardInput; file: string; onDone: (msg: string) => void }) {
  const [busy, setBusy] = useState(false)
  const canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      onDone('Copied to clipboard')
    } catch {
      onDone('Couldn’t copy, try again')
    }
  }

  const image = async (share: boolean) => {
    setBusy(true)
    try {
      const blob = await renderCard(card())
      const f = new File([blob], file, { type: 'image/png' })
      if (share && navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], text })
      else {
        download(blob, file)
        onDone('Image saved')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') onDone('Couldn’t make the image')
    } finally {
      setBusy(false)
    }
  }

  const btn = 'press flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-line hover:bg-panel disabled:opacity-50'
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button type="button" onClick={copy} className={btn}>
        <Copy className="size-4" aria-hidden /> Copy result
      </button>
      <button type="button" onClick={() => image(false)} disabled={busy} className={btn}>
        <Image className="size-4" aria-hidden /> Save image
      </button>
      {canShareFiles && (
        <button type="button" onClick={() => image(true)} disabled={busy} className={`${btn} sm:hidden`}>
          <Share2 className="size-4" aria-hidden /> Share
        </button>
      )}
    </div>
  )
}
