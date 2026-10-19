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
      .select('*, sekolah:sekolah!profiles_npsn_fkey(nama)');

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

  /**
   * Update profil user yang sedang login (self-service).
   * Tidak bisa mengubah role, status, atau npsn dari sini.
   */
  async function updateProfile(payload) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sesi tidak valid');

    const allowed = ['nama', 'nip', 'pangkat_golongan', 'jabatan',
                     'status_kepegawaian', 'jenis_kelamin', 'no_hp'];
    const changes = {};
    allowed.forEach(k => {
      if (payload[k] !== undefined) changes[k] = payload[k];
    });

    const { data, error } = await sb
      .from('profiles')
      .update(changes)
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalidate cache user
    window._cachedUser = null;

    return data;
  }

  /**
   * Ganti password user yang sedang login.
   * Memverifikasi password lama terlebih dahulu.
   */
  async function changePassword(oldPassword, newPassword) {
    if (!oldPassword) throw new Error('Password lama wajib diisi');
    if (!newPassword || newPassword.length < 6) throw new Error('Password baru minimal 6 karakter');
    if (oldPassword === newPassword) throw new Error('Password baru harus berbeda dari password lama');

    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sesi tidak valid');

    // Verifikasi password lama dengan signIn ulang
    const email = session.user.email;
    const { error: signInError } = await sb.auth.signInWithPassword({
      email: email,
      password: oldPassword
    });
    if (signInError) throw new Error('Password lama salah');

    // Update password
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);

    return { changed: true };
  }

  // ===== DABIN (Daerah Binaan Pengawas) =====
  async function getDabin(pengawasId) {
    const { data, error } = await sb
      .from('pengawas_sekolah')
      .select('npsn_sekolah')
      .eq('pengawas_id', pengawasId);
    if (error) throw new Error(error.message);
    return (data || []).map(d => d.npsn_sekolah);
  }

  async function setDabin(pengawasId, npsnList) {
    // Hapus mapping lama
    const { error: e1 } = await sb
      .from('pengawas_sekolah')
      .delete()
      .eq('pengawas_id', pengawasId);
    if (e1) throw new Error(e1.message);

    // Simpan mapping baru (jika ada)
    if (npsnList && npsnList.length > 0) {
      const rows = npsnList.map(npsn => ({
        pengawas_id: pengawasId,
        npsn_sekolah: npsn
      }));
      const { error: e2 } = await sb.from('pengawas_sekolah').insert(rows);
      if (e2) throw new Error(e2.message);
    }
    return true;
  }

  async function getAllDabinAssignments() {
    // Ambil semua relasi PS dan Sekolah beserta nama PS-nya
    const { data, error } = await sb
      .from('pengawas_sekolah')
      .select(`
        npsn_sekolah,
        pengawas_id,
        pengawas:profiles!pengawas_sekolah_pengawas_id_fkey(nama)
      `);
    if (error) throw new Error(error.message);
    return data || [];
  }

  return { list, stats, update, create, resetPassword, remove, softDelete, activate, updateProfile, changePassword, getDabin, setDabin, getAllDabinAssignments };
})();

window.UsersAPI = UsersAPI;
