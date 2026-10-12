/**
 * SISPA v2 — Supabase Client
 */
const supabase = window.supabase.createClient(
  SISPA_CONFIG.SUPABASE_URL,
  SISPA_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

window.sb = supabase;
