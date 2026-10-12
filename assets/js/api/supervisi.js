/**
 * SISPA v2 — API Supervisi (Header + 3 Tahap)
 * 
 * v1.1 — Tambah: savePra, saveObservasi, savePasca, selesaikan, unwrap
 *        Supaya form 3 tahap TIDAK bypass API layer (fix bug #2)
 */

const SupervisiAPI = (function () {

  // ===== HELPER: unwrap join (fix bug #1) =====
  function unwrap(v) {
    if (Array.isArray(v)) return v[0] || null;
    return v;
  }

  // ===== LIST =====
  async function list(opts = {}) {
    let query = sb
      .from('supervisi')
      .select('*, guru:guru(id, nama, nip, mapel, kelas), sekolah:sekolah(nama)');

    if (opts.npsn_sekolah) query = query.eq('npsn_sekolah', opts.npsn_sekolah);
    if (opts.guru_id) query = query.eq('guru_id', opts.guru_id);
    if (opts.status) query = query.eq('status', opts.status);
    if (opts.pendekatan) query = query.eq('pendekatan', opts.pendekatan);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map(s => ({
      ...s,
      nama_guru: s.guru?.nama || null,
      nama_sekolah: s.sekolah?.nama || null
    }));
  }

  // ===== GET (single) =====
  async function get(id) {
    const { data, error } = await sb
      .from('supervisi')
      .select(`
        *,
        guru:guru(id, nama, nip, mapel, kelas),
        sekolah:sekolah(nama),
        pra_observasi(*),
        observasi(*),
        pasca_observasi(*),
        profil_tipe:profil_tipe_guru(
          id, tipe, level_abstraksi, level_komitmen, pendekatan_rekomendasi, periode
        )
      `)
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);

    return {
      ...data,
      nama_guru: data.guru?.nama || null,
      nama_sekolah: data.sekolah?.nama || null,
      // Fix bug #1: unwrap
      pra_observasi: unwrap(data.pra_observasi),
      observasi: unwrap(data.observasi),
      pasca_observasi: unwrap(data.pasca_observasi),
      profil_tipe: unwrap(data.profil_tipe)
    };
  }

  // ===== CREATE (draft baru) =====
  async function create(payload) {
    if (!payload.guru_id) throw new Error('Guru wajib diisi');
    if (!payload.npsn_sekolah) throw new Error('Sekolah wajib diisi');
    if (!payload.pendekatan) throw new Error('Pendekatan wajib dipilih');

    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sesi tidak valid');

    const { data, error } = await sb
      .from('supervisi')
      .insert([{
        guru_id: payload.guru_id,
        npsn_sekolah: payload.npsn_sekolah,
        supervisor_id: session.user.id,
        profil_tipe_guru_id: payload.profil_tipe_guru_id || null,
        pendekatan: payload.pendekatan,
        teknik: payload.teknik || null,
        status: payload.status || 'draft',
        aspek_pm: payload.aspek_pm || {},
        pengalaman_belajar: payload.pengalaman_belajar || {},
        dpl_target: payload.dpl_target || [],
        kka_fokus: payload.kka_fokus || null,
        tanggal_mulai: payload.tanggal_mulai || new Date().toISOString().slice(0, 10)
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ===== UPDATE (header) =====
  async function update(id, payload) {
    const changes = {};
    const allowed = ['pendekatan', 'teknik', 'status', 'aspek_pm',
                     'pengalaman_belajar', 'dpl_target', 'kka_fokus',
                     'tanggal_mulai', 'tanggal_selesai', 'profil_tipe_guru_id'];
    allowed.forEach(k => {
      if (payload[k] !== undefined) changes[k] = payload[k];
    });

    const { data, error } = await sb
      .from('supervisi')
      .update(changes)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function remove(id) {
    const { error } = await sb.from('supervisi').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  // ===== UPSERT HELPER (internal) =====
  async function upsertChild(table, supervisiId, payload) {
    // Cek existing
    const { data: existing } = await sb
      .from(table)
      .select('id')
      .eq('supervisi_id', supervisiId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await sb
        .from(table)
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const { data, error } = await sb
      .from(table)
      .insert([{ supervisi_id: supervisiId, ...payload }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // ===== SAVE PRA-OBSERVASI (tahap 1) =====
  async function savePra(supervisiId, payload) {
    if (!supervisiId) throw new Error('supervisi_id wajib diisi');
    return upsertChild('pra_observasi', supervisiId, payload);
  }

  // ===== SAVE OBSERVASI (tahap 2) =====
  async function saveObservasi(supervisiId, payload) {
    if (!supervisiId) throw new Error('supervisi_id wajib diisi');
    return upsertChild('observasi', supervisiId, payload);
  }

  // ===== SAVE PASCA-OBSERVASI (tahap 3) =====
  async function savePasca(supervisiId, payload) {
    if (!supervisiId) throw new Error('supervisi_id wajib diisi');
    return upsertChild('pasca_observasi', supervisiId, payload);
  }

  // ===== SELESAIKAN SUPERVISI =====
  async function selesaikan(supervisiId) {
    return update(supervisiId, {
      status: 'selesai',
      tanggal_selesai: new Date().toISOString().slice(0, 10)
    });
  }

  // ===== STATISTIK =====
  async function stats(npsnSekolah) {
    const { data, error } = await sb
      .from('supervisi')
      .select('status')
      .eq('npsn_sekolah', npsnSekolah);
    if (error) throw new Error(error.message);

    const s = { total: data.length, draft: 0, berjalan: 0, selesai: 0 };
    data.forEach(x => {
      if (x.status === 'draft') s.draft++;
      else if (x.status === 'selesai') s.selesai++;
      else s.berjalan++;
    });
    return s;
  }

  return {
    list, get, create, update, remove, stats,
    savePra, saveObservasi, savePasca, selesaikan,
    unwrap
  };
})();

window.SupervisiAPI = SupervisiAPI;
