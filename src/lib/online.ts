import { useEffect, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import { load, save } from './storage'

export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null
export const online = supabase !== null

export type DailyGame = 'word' | 'link' | 'mini'

/** Who's playing on this device: a random id made once, and the name they chose */
export type Player = { id: string; name: string }

let player: Player | null = load<Player | null>('player', null)
const listeners = new Set<(p: Player | null) => void>()

export function usePlayer() {
  const [p, setP] = useState(player)
  useEffect(() => {
    listeners.add(setP)
    return () => void listeners.delete(setP)
  }, [])
  return p
}

export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, 20)

export function setPlayerName(name: string) {
  player = { id: player?.id ?? crypto.randomUUID(), name: cleanName(name) }
  save('player', player)
  listeners.forEach((l) => l(player))
}

export type Score = { player: string; name: string; seconds: number; extra: number | null; created_at: string }

/** Posts a finished daily puzzle. Each player gets one entry per puzzle; a repeat is quietly ignored. */
export async function submitDaily(game: DailyGame, day: number, seconds: number, extra: number | null) {
  if (!supabase || !player) return
  await supabase.from('daily_scores').insert({ player: player.id, name: player.name, game, day, seconds: Math.max(1, Math.round(seconds)), extra })
}

/** Today's (or any day's) board: fastest first, ties go to whoever finished earlier */
export async function fetchDaily(game: DailyGame, day: number): Promise<Score[]> {
  if (!supabase) return []
  const { data } = await supabase.from('daily_scores').select('player, name, seconds, extra, created_at').eq('game', game).eq('day', day).order('seconds').order('created_at').limit(50)
  return (data as Score[] | null) ?? []
}
