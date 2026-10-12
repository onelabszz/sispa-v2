/**
 * SISPA v2 — API Pengawas
 * Agregat data lintas sekolah (RLS yang membatasi ke sekolah binaan)
 */

const PengawasAPI = (function () {

  /**
   * Dashboard agregat: semua sekolah binaan + statistik global.
   * Bergantung pada RLS yang restrict pengawas ke sekolah binaannya.
   */
  async function dashboard(opts = {}) {
    // 1. Ambil semua sekolah
    let qSekolah = sb.from('sekolah').select('*').eq('status', 'aktif');
    if (opts.periode) qSekolah = qSekolah; // periode tidak filter sekolah

    const { data: sekolahList, error: errS } = await qSekolah;
    if (errS) throw new Error(errS.message);
    if (!sekolahList || sekolahList.length === 0) {
      return {
        total_sekolah: 0,
        total_guru: 0,
        total_dinilai: 0,
        total_belum_dinilai: 0,
        total_supervisi: 0,
        supervisi_selesai: 0,
        supervisi_berjalan: 0,
        distribusi_tipe: { dropout: 0, unfocused_worker: 0, analytical_observer: 0, professional: 0 },
        per_sekolah: []
      };
    }

    const npsnList = sekolahList.map(s => s.npsn);

    // 2. Ambil guru aktif di semua sekolah tsb
    const { data: guruList, error: errG } = await sb
      .from('guru')
      .select('id, npsn_sekolah, nama, status')
      .in('npsn_sekolah', npsnList)
      .eq('status', 'aktif');
    if (errG) throw new Error(errG.message);

    const guruIds = (guruList || []).map(g => g.id);

    // 3. Ambil profil tipe guru (opsional filter periode)
    let qTipe = sb.from('profil_tipe_guru').select('id, guru_id, tipe, periode, level_abstraksi, level_komitmen');
    if (guruIds.length > 0) qTipe = qTipe.in('guru_id', guruIds);
    else qTipe = null;

    let tipeList = [];
    if (qTipe) {
      if (opts.periode) qTipe = qTipe.eq('periode', opts.periode);
      const { data, error } = await qTipe;
      if (error) throw new Error(error.message);
      tipeList = data || [];
    }

    // Map guru_id → tipe terbaru
    const tipeByGuru = {};
    tipeList.forEach(t => {
      const existing = tipeByGuru[t.guru_id];
      if (!existing) tipeByGuru[t.guru_id] = t;
    });

    // 4. Ambil supervisi
    let qSup = sb
      .from('supervisi')
      .select('id, npsn_sekolah, guru_id, status, pendekatan, tanggal_mulai, tanggal_selesai');
    if (npsnList.length > 0) qSup = qSup.in('npsn_sekolah', npsnList);

    let supList = [];
    {
      const { data, error } = await qSup;
      if (error) throw new Error(error.message);
      supList = data || [];
    }

    // 5. Agregat per sekolah
    const perSekolah = sekolahList.map(sk => {
      const guruSk = (guruList || []).filter(g => g.npsn_sekolah === sk.npsn);
      const guruIdsSk = guruSk.map(g => g.id);
      const tipeSk = tipeList.filter(t => guruIdsSk.includes(t.guru_id));
      const supSk = supList.filter(s => s.npsn_sekolah === sk.npsn);

      const dinilai = new Set(tipeSk.map(t => t.guru_id)).size;
      const belum = guruSk.length - dinilai;

      const selesai = supSk.filter(s => s.status === 'selesai').length;
      const berjalan = supSk.filter(s => !['draft','selesai'].includes(s.status)).length;

      const dist = { dropout: 0, unfocused_worker: 0, analytical_observer: 0, professional: 0 };
      tipeSk.forEach(t => { if (dist[t.tipe] !== undefined) dist[t.tipe]++; });

      return {
        npsn: sk.npsn,
        nama: sk.nama,
        jenjang: sk.jenjang,
        kecamatan: sk.kecamatan,
        jumlah_guru: guruSk.length,
        sudah_dinilai: dinilai,
        belum_dinilai: belum,
        total_supervisi: supSk.length,
        supervisi_selesai: selesai,
        supervisi_berjalan: berjalan,
        distribusi: dist
      };
    });

    // 6. Distribusi global
    const distribusi = { dropout: 0, unfocused_worker: 0, analytical_observer: 0, professional: 0 };
    tipeList.forEach(t => { if (distribusi[t.tipe] !== undefined) distribusi[t.tipe]++; });

    return {
      total_sekolah: sekolahList.length,
      total_guru: (guruList || []).length,
      total_dinilai: Object.keys(tipeByGuru).length,
      total_belum_dinilai: (guruList || []).length - Object.keys(tipeByGuru).length,
      total_supervisi: supList.length,
      supervisi_selesai: supList.filter(s => s.status === 'selesai').length,
      supervisi_berjalan: supList.filter(s => !['draft','selesai'].includes(s.status)).length,
      distribusi_tipe: distribusi,
      per_sekolah: perSekolah
    };
  }

  /**
   * Detail satu sekolah: guru, tipe, supervisi.
   */
  async function sekolahDetail(npsn, opts = {}) {
    if (!npsn) throw new Error('NPSN wajib diisi');

    const { data: sekolah, error: errS } = await sb
      .from('sekolah')
      .select('*')
      .eq('npsn', npsn)
      .single();
    if (errS) throw new Error(errS.message);

    const { data: guruList, error: errG } = await sb
      .from('guru')
      .select('*')
      .eq('npsn_sekolah', npsn)
      .eq('status', 'aktif')
      .order('nama');
    if (errG) throw new Error(errG.message);

    const guruIds = (guruList || []).map(g => g.id);

    // Tipe guru
    let tipeList = [];
    if (guruIds.length > 0) {
      let qT = sb.from('profil_tipe_guru').select('*').in('guru_id', guruIds);
      if (opts.periode) qT = qT.eq('periode', opts.periode);
      const { data, error } = await qT.order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      tipeList = data || [];
    }

    const tipeByGuru = {};
    tipeList.forEach(t => { if (!tipeByGuru[t.guru_id]) tipeByGuru[t.guru_id] = t; });

    // Supervisi
    const { data: supList, error: errSup } = await sb
      .from('supervisi')
      .select('*, guru:guru(id, nama, mapel, kelas)')
      .eq('npsn_sekolah', npsn)
      .order('created_at', { ascending: false });
    if (errSup) throw new Error(errSup.message);

    // Gabung guru + tipe + stat supervisi
    const guruDetail = (guruList || []).map(g => {
      const t = tipeByGuru[g.id] || null;
      const supG = (supList || []).filter(s => s.guru_id === g.id);
      return {
        ...g,
        tipe: t,
        total_supervisi: supG.length,
        supervisi_selesai: supG.filter(s => s.status === 'selesai').length,
        supervisi_terakhir: supG[0]?.tanggal_mulai || null,
        supervisi_terbaru: supG[0] || null
      };
    });

    return {
      sekolah,
      guru: guruDetail,
      supervisi: supList || [],
      ringkasan: {
        total_guru: guruDetail.length,
        sudah_dinilai: guruDetail.filter(g => g.tipe).length,
        belum_dinilai: guruDetail.filter(g => !g.tipe).length,
        total_supervisi: (supList || []).length,
        supervisi_selesai: (supList || []).filter(s => s.status === 'selesai').length
      }
    };
  }

  /**
   * Distribusi tipe guru lintas sekolah (untuk peta kuadran).
   */
  async function distribusiTipeLintas(opts = {}) {
    const dash = await dashboard(opts);
    return {
      total: dash.total_dinilai,
      distribusi: dash.distribusi_tipe
    };
  }

  return { dashboard, sekolahDetail, distribusiTipeLintas };
})();

window.PengawasAPI = PengawasAPI;
