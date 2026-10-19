const ObsCoachingAPI = (function () {
  const INSTRUMEN = [
    { tahap: 'S', kode: 'S1', teks: 'Kepala Sekolah menggali konteks/latar belakang penerapan pembelajaran berbasis digital (kondisi kelas, sarana TIK, karakteristik murid).' },
    { tahap: 'T', kode: 'T1', teks: 'Kepala Sekolah menggali tujuan pembelajaran dan target penggunaan media/platform digital yang ingin dicapai guru.' },
    { tahap: 'A', kode: 'A1', teks: 'Kepala Sekolah menggali langkah-langkah konkret yang dilakukan guru dalam mengintegrasikan teknologi/PID ke dalam proses pembelajaran.' },
    { tahap: 'R', kode: 'R1', teks: 'Kepala Sekolah menggali dampak/hasil dari penerapan pembelajaran digital, baik dari sisi capaian belajar siswa maupun refleksi pribadi guru.' },
    { tahap: 'G', kode: 'G1', teks: 'Kepala Sekolah memfasilitasi guru merumuskan tujuan pengembangan diri yang spesifik terkait pemanfaatan pembelajaran berbasis digital.' },
    { tahap: 'R', kode: 'R2', teks: 'Kepala Sekolah membantu guru mengidentifikasi kondisi nyata secara jujur dan objektif, termasuk kendala dan kompetensi digital.' },
    { tahap: 'O', kode: 'O1', teks: 'Kepala Sekolah mendorong guru menghasilkan beberapa alternatif strategi atau solusi untuk meningkatkan kualitas.' },
    { tahap: 'W', kode: 'W1', teks: 'Kepala Sekolah memastikan guru menetapkan langkah tindak lanjut yang konkret, terukur, dan disertai komitmen waktu.' }
  ];

  function getInstrumen() { return INSTRUMEN; }

  function hitungSkor(detail) {
    const total = detail.reduce((s, d) => s + (d.skor || 0), 0);
    const max = INSTRUMEN.length * 4; // 32
    const persen = (total / max) * 100;
    let kategori = 'Belum Tampak';
    if (persen >= 86) kategori = 'Konsisten/Optimal';
    else if (persen >= 71) kategori = 'Berkembang';
    else if (persen >= 51) kategori = 'Mulai Tampak';
    return { total, max, persen: Math.round(persen*100)/100, kategori };
  }

  async function list(opts = {}) {
    let q = sb.from('obs_coaching').select('*, guru:guru(nama, mapel, kelas), sekolah:sekolah(nama)');
    if (opts.npsn_sekolah) q = q.eq('npsn_sekolah', opts.npsn_sekolah);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function get(id) {
    const { data: header, error: e1 } = await sb.from('obs_coaching').select('*, guru:guru(*), sekolah:sekolah(*)').eq('id', id).single();
    if (e1) throw new Error(e1.message);
    const { data: detail, error: e2 } = await sb.from('obs_coaching_detail').select('*').eq('obs_id', id);
    if (e2) throw new Error(e2.message);
    const { data: rtl, error: e3 } = await sb.from('obs_coaching_rtl').select('*').eq('obs_id', id);
    if (e3) throw new Error(e3.message);
    return { header, detail: detail || [], rtl: rtl || [], instrumen: INSTRUMEN };
  }

  async function save(payload) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sesi tidak valid');

    const detail = payload.detail || [];
    const skor = hitungSkor(detail);

    const headerPayload = {
      npsn_sekolah: payload.npsn_sekolah,
      guru_id: payload.guru_id,
      observer_id: session.user.id,
      tanggal: payload.tanggal,
      skor_total: skor.total,
      persen_capaian: skor.persen,
      kategori: skor.kategori,
      catatan_kekuatan: payload.catatan_kekuatan,
      catatan_area: payload.catatan_area,
      status: payload.status || 'draft',
      updated_at: new Date().toISOString()
    };

    let id = payload.id;
    if (id) {
      const { error } = await sb.from('obs_coaching').update(headerPayload).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await sb.from('obs_coaching').insert([headerPayload]).select().single();
      if (error) throw new Error(error.message);
      id = ins.id;
    }

    await sb.from('obs_coaching_detail').delete().eq('obs_id', id);
    if (detail.length > 0) {
      const rows = detail.map(d => ({ obs_id: id, tahap: d.tahap, kode: d.kode, skor: d.skor, catatan: d.catatan }));
      const { error } = await sb.from('obs_coaching_detail').insert(rows);
      if (error) throw new Error(error.message);
    }

    await sb.from('obs_coaching_rtl').delete().eq('obs_id', id);
    if (payload.rtl && payload.rtl.length > 0) {
      const rtlRows = payload.rtl.map(r => ({ obs_id: id, rencana_aksi: r.rencana_aksi, waktu_pelaksanaan: r.waktu_pelaksanaan, dukungan: r.dukungan, indikator_keberhasilan: r.indikator_keberhasilan }));
      const { error } = await sb.from('obs_coaching_rtl').insert(rtlRows);
      if (error) throw new Error(error.message);
    }

    return { id, ...skor };
  }

  return { getInstrumen, hitungSkor, list, get, save };
})();
window.ObsCoachingAPI = ObsCoachingAPI;
