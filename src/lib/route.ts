import { useEffect, useState } from 'react'

export type Game = 'type' | 'word' | 'link' | 'mini'
export const GAMES: { id: Game; label: string }[] = [
  { id: 'type', label: 'Type' },
  { id: 'word', label: 'Word' },
  { id: 'link', label: 'Link' },
  { id: 'mini', label: 'Mini' },
]

/** The address is the state: no hash is the home page, #/link opens today's Link, #/link/4 opens Daily #4 from the archive */
export type Route = { game: Game | 'home'; day: number | null }

function parse(): Route {
  const [, g, d] = location.hash.split('/')
  const game = GAMES.some((x) => x.id === g) ? (g as Game) : 'home'
  const n = Number(d)
  return { game, day: d && Number.isInteger(n) && n >= 1 ? n - 1 : null }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

/** Link to a daily puzzle: today's has no number in the address */
export const dailyHref = (game: Game, day: number, today: number) => (day === today ? `#/${game}` : `#/${game}/${day + 1}`)
