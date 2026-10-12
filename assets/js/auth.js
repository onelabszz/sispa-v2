/**
 * SISPA v2 — Auth
 */
async function login(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = '/sispa-v2/index.html';
}

async function getCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return profile;
}

async function requireAuth(allowedRoles) {
  const profile = await getCurrentUser();
  if (!profile) {
    window.location.href = '/sispa-v2/index.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    alert('Akses ditolak');
    window.location.href = '/sispa-v2/index.html';
    return null;
  }
  return profile;
}

window.login = login;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.requireAuth = requireAuth;
