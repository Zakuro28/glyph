import { useEffect, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import { onSave, storedKeys, writeRaw } from './storage'
import type { Game } from './route'

export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
export const online = supabase !== null

export type Account = { id: string; username: string } | null

let account: Account = null
const listeners = new Set<(a: Account) => void>()
const set = (a: Account) => {
  account = a
  listeners.forEach((l) => l(a))
}

export function useAccount() {
  const [a, setA] = useState(account)
  useEffect(() => {
    listeners.add(setA)
    return () => void listeners.delete(setA)
  }, [])
  return a
}

// Keys that stay on this device only
const LOCAL_ONLY = new Set(['muted'])

/** On sign-in: bring this account's saved progress onto the device, then send up anything only this device has */
async function pull(userId: string) {
  if (!supabase) return
  const { data } = await supabase.from('progress').select('key, value')
  const remote = new Map((data ?? []).map((r) => [r.key as string, r.value]))
  let changed = false
  remote.forEach((value, key) => {
    if (writeRaw(key, value)) changed = true
  })
  const mine = storedKeys().filter((k) => !remote.has(k) && !LOCAL_ONLY.has(k))
  if (mine.length) await supabase.from('progress').upsert(mine.map((key) => ({ key, value: JSON.parse(localStorage.getItem(`glyph:${key}`) ?? 'null'), updated_at: new Date().toISOString() })))
  // Screens already showing old numbers reload once so everything matches the account
  const flag = `glyph-synced-${userId}`
  if (changed && !sessionStorage.getItem(flag)) {
    sessionStorage.setItem(flag, '1')
    location.reload()
  }
}

async function loadAccount(userId: string) {
  if (!supabase) return
  const { data } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle()
  set({ id: userId, username: data?.username ?? 'player' })
  void pull(userId)
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => data.session && loadAccount(data.session.user.id))
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session && account?.id !== session.user.id) void loadAccount(session.user.id)
    if (event === 'SIGNED_OUT') set(null)
  })

  // Every save goes up too (gathered for a moment, so fast typing doesn't flood the network)
  const pending = new Map<string, unknown>()
  let timer = 0
  onSave((key, value) => {
    if (!account || LOCAL_ONLY.has(key)) return
    pending.set(key, value)
    clearTimeout(timer)
    timer = window.setTimeout(() => {
      const rows = [...pending].map(([k, v]) => ({ key: k, value: v, updated_at: new Date().toISOString() }))
      pending.clear()
      void supabase!.from('progress').upsert(rows)
    }, 1500)
  })
}

export async function signUp(email: string, password: string, username: string) {
  if (!supabase) return { error: 'Accounts are not set up' }
  const name = username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(name)) return { error: 'Usernames are 3 to 20 letters, numbers or underscores' }
  const { data: taken } = await supabase.from('profiles').select('id').eq('username', name).maybeSingle()
  if (taken) return { error: 'That username is taken' }
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username: name } } })
  if (error) return { error: error.message }
  return { confirm: !data.session }
}

export async function signIn(email: string, password: string) {
  if (!supabase) return { error: 'Accounts are not set up' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return { error: error?.message }
}

export const signOut = () => supabase?.auth.signOut()

/** Posts a result to the leaderboard when signed in. Quietly does nothing otherwise. */
export function submitScore(game: Game, board: string, score: number) {
  if (!supabase || !account) return
  void supabase.from('scores').insert({ game, board, score })
}

export type Row = { username: string; score: number; created_at: string }

export async function leaderboard(game: Game, board: string): Promise<Row[]> {
  if (!supabase) return []
  const { data } = await supabase.rpc('leaderboard', { p_game: game, p_board: board, p_limit: 25 })
  return (data as Row[] | null) ?? []
}
