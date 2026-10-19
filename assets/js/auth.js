/**
 * SISPA v2 — Auth
 * v1.1 — getCurrentUser robust: handle admin (npsn null), FK missing, RLS, dll.
 */

async function login(identifier, password) {
  let email = identifier.trim();

  // Jika bukan email (tidak ada @), anggap sebagai NPSN
  if (!email.includes('@')) {
    // Cari email dari profil berdasarkan NPSN
    const { data: profile, error: errProfile } = await sb
      .from('profiles')
      .select('email')
      .eq('npsn', email)
      .eq('role', 'ks') // Hanya KS yang punya NPSN
      .maybeSingle();

    if (errProfile || !profile || !profile.email) {
      throw new Error('NPSN tidak ditemukan atau tidak terdaftar sebagai Kepala Sekolah.');
    }
    email = profile.email;
  }

  // Proses login ke Supabase Auth
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    // Terjemahkan error Supabase ke bahasa Indonesia
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Email/NPSN atau password salah.');
    }
    throw new Error(error.message);
  }
  
  window._cachedUser = null;
  return data;
}

async function logout() {
  await sb.auth.signOut();
  window._cachedUser = null;
  window.location.href = '/sispa-v2/index.html';
}

async function getCurrentUser() {
  if (window._cachedUser) return window._cachedUser;

  // ===== STEP 1: Cek session =====
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    console.warn('[SISPA] getCurrentUser: tidak ada session aktif');
    return null;
  }

  // ===== STEP 2: Ambil profile TANPA join =====
  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('[SISPA] getCurrentUser GAGAL mengambil profil:', {
      userId: user.id,
      userEmail: user.email,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error?.details,
      errorHint: error?.hint,
      rawError: error
    });
    return null;
  }

  // ===== STEP 3: Ambil nama sekolah KONDISIONAL =====
  let nama_sekolah = null;
  if (profile.npsn) {
    try {
      const { data: sekolah } = await sb
        .from('sekolah')
        .select('nama')
        .eq('npsn', profile.npsn)
        .maybeSingle();
      nama_sekolah = sekolah?.nama || null;
    } catch (e) {
      console.warn('[SISPA] Sekolah tidak ditemukan untuk npsn:', profile.npsn);
    }
  }

  // ===== STEP 4: Bangun user dengan default aman =====
  const result = {
    ...profile,
    email: user.email,
    nama_sekolah: nama_sekolah,
    role: profile.role || 'ks',
    status: profile.status || 'aktif'
  };

  window._cachedUser = result;
  return result;
}

async function requireAuth(allowedRoles) {
  const profile = await getCurrentUser();
  if (!profile) {
    window.location.href = '/sispa-v2/index.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    alert('Akses ditolak: role Anda tidak diizinkan');
    window.location.href = '/sispa-v2/index.html';
    return null;
  }
  return profile;
}

window.login = login;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.requireAuth = requireAuth;
