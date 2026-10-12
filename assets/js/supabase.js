/**
 * SISPA v2 — Supabase Client
 *
 * CDN Supabase sudah punya global `window.supabase`.
 * Kita pakai nama `sb` untuk client kita agar tidak bentrok.
 */

window.sb = window.supabase.createClient(
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

console.log('[SISPA] Supabase client siap:', SISPA_CONFIG.SUPABASE_URL);
