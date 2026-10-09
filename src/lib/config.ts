// Supabase project for the daily leaderboard. Both values are public by design:
// the database's row-level security rules (supabase/schema.sql) decide what anyone can read or write.
// Leave them empty and Glyph runs fully offline with no leaderboard.
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''
