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
