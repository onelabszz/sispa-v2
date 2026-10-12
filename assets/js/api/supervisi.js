/**
 * SISPA v2 — API Supervisi (Header + 3 Tahap)
 */

const SupervisiAPI = (function () {

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
          id, tipe, level_abstraksi, level_komitmen, pendekatan_rekomendasi
        )
      `)
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return {
      ...data,
      nama_guru: data.guru?.nama || null,
      nama_sekolah: data.sekolah?.nama || null
    };
  }

  /**
   * Buat sesi supervisi baru (masih draft).
   */
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
        status: 'draft',
        aspek_pm: payload.aspek_pm || {},
        pengalaman_belajar: payload.pengalaman_belajar || {},
        dpl_target: payload.dpl_target || [],
        kka_fokus: payload.kka_fokus || null,
        tanggal_mulai: payload.tanggal_mulai || new Date().toISOString().slice(0,10)
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function update(id, payload) {
    const changes = {};
    const allowed = ['pendekatan','teknik','status','aspek_pm','pengalaman_belajar',
                     'dpl_target','kka_fokus','tanggal_mulai','tanggal_selesai'];
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

  // ===== STATISTIK RINGKAS =====
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

  return { list, get, create, update, remove, stats };
})();

window.SupervisiAPI = SupervisiAPI;
