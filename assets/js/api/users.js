/**
 * SISPA v2 — API Users
 */

const UsersAPI = (function () {

  const FUNCTIONS_URL = SISPA_CONFIG.SUPABASE_URL + '/functions/v1/admin-users';

  async function getAuthHeader() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Tidak ada sesi aktif');
    return 'Bearer ' + session.access_token;
  }

  async function list(opts = {}) {
    let query = sb
      .from('profiles')
      .select('*, sekolah:sekolah(nama)');

    if (opts.role) query = query.eq('role', opts.role);
    if (opts.status) query = query.eq('status', opts.status);
    if (opts.npsn) query = query.eq('npsn', opts.npsn);
    if (opts.q) {
      query = query.or(`nama.ilike.%${opts.q}%,email.ilike.%${opts.q}%,nip.ilike.%${opts.q}%`);
    }

    query = query.order('role', { ascending: true }).order('nama', { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map(u => ({
      ...u,
      nama_sekolah: u.sekolah?.nama || null
    }));
  }

  async function stats() {
    const { data, error } = await sb.from('profiles').select('role, status');
    if (error) throw new Error(error.message);

    const result = {
      total: data.length,
      admin: 0, pengawas: 0, ks: 0, guru: 0,
      aktif: 0, nonaktif: 0
    };
    data.forEach(u => {
      if (result[u.role] !== undefined) result[u.role]++;
      if (u.status === 'aktif') result.aktif++; else result.nonaktif++;
    });
    return result;
  }

  async function update(id, payload) {
    // Update field profil (BUKAN auth)
    const allowed = ['nama', 'nip', 'pangkat_golongan', 'jabatan', 'status_kepegawaian',
                     'jenis_kelamin', 'no_hp', 'email', 'npsn', 'status'];
    const changes = {};
    allowed.forEach(k => {
      if (payload[k] !== undefined) changes[k] = payload[k];
    });

    const { data, error } = await sb
      .from('profiles')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function create(payload) {
    // Panggil Edge Function
    const authHeader = await getAuthHeader();
    const res = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'create', ...payload })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal membuat user');
    return data;
  }

  async function resetPassword(userId, newPassword) {
    const authHeader = await getAuthHeader();
    const res = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'reset_password', user_id: userId, new_password: newPassword })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal reset password');
    return data;
  }

  async function remove(userId) {
    const authHeader = await getAuthHeader();
    const res = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'delete', user_id: userId })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal hapus user');
    return data;
  }

  async function softDelete(id) {
    return update(id, { status: 'nonaktif' });
  }

  async function activate(id) {
    return update(id, { status: 'aktif' });
  }

  return { list, stats, update, create, resetPassword, remove, softDelete, activate };
})();

window.UsersAPI = UsersAPI;
