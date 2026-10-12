/**
 * SISPA v2 — Auth
 */
async function login(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  // Clear cache
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

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await sb
    .from('profiles')
    .select('*, sekolah:sekolah(nama)')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('[SISPA] getCurrentUser error:', error);
    return null;
  }

  const result = {
    ...profile,
    email: user.email,
    nama_sekolah: profile.sekolah?.nama || null
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
