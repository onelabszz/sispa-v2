const ObsAkademikAPI = (function () {
  const INSTRUMEN = [
    { kode: 'A1', section: 'A. Perencanaan dan Kesiapan Pembelajaran Digital', teks: 'Tujuan pembelajaran dirumuskan jelas dan selaras dengan pemanfaatan media/platform digital yang dipilih.' },
    { kode: 'A2', section: 'A. Perencanaan dan Kesiapan Pembelajaran Digital', teks: 'Media/platform digital yang dipilih sesuai dengan karakteristik materi dan capaian pembelajaran.' },
    { kode: 'A3', section: 'A. Perencanaan dan Kesiapan Pembelajaran Digital', teks: 'Guru menunjukkan penguasaan teknis terhadap perangkat dan aplikasi yang digunakan.' },
    { kode: 'B1', section: 'B. Pemanfaatan Platform dan Media Digital dalam Pembelajaran', teks: 'Murid menggunakan berbagai fitur platform digital secara bermakna untuk mengkonstruksi pemahaman dan berkolaborasi.' },
    { kode: 'B2', section: 'B. Pemanfaatan Platform dan Media Digital dalam Pembelajaran', teks: 'Konten digital yang ditampilkan relevan, akurat, dan mendukung pemahaman konsep murid.' },
    { kode: 'B3', section: 'B. Pemanfaatan Platform dan Media Digital dalam Pembelajaran', teks: 'Guru mampu mengatasi kendala teknis dengan cepat tanpa mengganggu alur pembelajaran secara signifikan.' },
    { kode: 'C1', section: 'C. Interaksi dan Keterlibatan Murid', teks: 'Murid terlibat aktif berinteraksi dengan media digital, bukan hanya menyimak secara pasif.' },
    { kode: 'C2', section: 'C. Interaksi dan Keterlibatan Murid', teks: 'Murid menerima umpan balik secara langsung atas progres dan hasil kerjanya melalui media digital.' },
    { kode: 'C3', section: 'C. Interaksi dan Keterlibatan Murid', teks: 'Terdapat variasi aktivitas digital yang mendorong kolaborasi antar murid.' },
    { kode: 'C4', section: 'C. Interaksi dan Keterlibatan Murid', teks: 'Murid aktif bertanya dan berpendapat melalui kanal digital yang tersedia.' },
    { kode: 'D1', section: 'D. Literasi Digital dan Etika Penggunaan Teknologi', teks: 'Murid menerapkan etika, tata tertib, dan panduan yang berlaku dalam menggunakan perangkat atau platform digital.' },
    { kode: 'D2', section: 'D. Literasi Digital dan Etika Penggunaan Teknologi', teks: 'Murid secara aktif memilah, menyaring, dan memverifikasi informasi digital secara kritis.' },
    { kode: 'D3', section: 'D. Literasi Digital dan Etika Penggunaan Teknologi', teks: 'Murid menunjukkan perilaku yang bijak, aman, dan bertanggung jawab dalam memanfaatkan teknologi.' },
    { kode: 'E1', section: 'E. Asesmen Berbasis Digital', teks: 'Murid menyelesaikan instrumen asesmen digital secara mandiri untuk mengukur pemahaman.' },
    { kode: 'E2', section: 'E. Asesmen Berbasis Digital', teks: 'Hasil asesmen digital dimanfaatkan guru untuk memberikan umpan balik atau menyesuaikan strategi.' },
    { kode: 'E3', section: 'E. Asesmen Berbasis Digital', teks: 'Murid dapat mengikuti dan menyelesaikan proses asesmen digital dengan lancar.' },
    { kode: 'F1', section: 'F. Pengelolaan Kelas Digital', teks: 'Guru mampu mengelola perhatian murid agar tetap fokus pada tujuan pembelajaran.' },
    { kode: 'F2', section: 'F. Pengelolaan Kelas Digital', teks: 'Murid terlibat secara seimbang antara aktivitas berbasis digital dengan aktivitas non-digital.' },
    { kode: 'F3', section: 'F. Pengelolaan Kelas Digital', teks: 'Suasana kelas digital tetap kondusif, tertib, dan mendukung proses belajar.' }
  ];

  function getInstrumen() { return INSTRUMEN; }

  function hitungSkor(detail) {
    const total = detail.reduce((s, d) => s + (d.skor || 0), 0);
    const max = INSTRUMEN.length * 4; // 76
    const persen = (total / max) * 100;
    let kategori = 'Belum Terlihat';
    if (persen >= 86) kategori = 'Mahir';
    else if (persen >= 71) kategori = 'Berkembang';
    else if (persen >= 51) kategori = 'Mulai Terlihat';
    return { total, max, persen: Math.round(persen*100)/100, kategori };
  }

  async function list(opts = {}) {
    let q = sb.from('obs_akademik').select('*, guru:guru(nama, mapel, kelas), sekolah:sekolah(nama)');
    if (opts.npsn_sekolah) q = q.eq('npsn_sekolah', opts.npsn_sekolah);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function get(id) {
    const { data: header, error: e1 } = await sb.from('obs_akademik').select('*, guru:guru(*), sekolah:sekolah(*)').eq('id', id).single();
    if (e1) throw new Error(e1.message);
    const { data: detail, error: e2 } = await sb.from('obs_akademik_detail').select('*').eq('obs_id', id);
    if (e2) throw new Error(e2.message);
    return { header, detail: detail || [], instrumen: INSTRUMEN };
  }

  async function save(payload) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sesi tidak valid');

    const detail = payload.detail || [];
    const skor = hitungSkor(detail);

    const headerPayload = {
      npsn_sekolah: payload.npsn_sekolah,
      guru_id: payload.guru_id,
      supervisor_id: session.user.id,
      tanggal: payload.tanggal,
      mapel: payload.mapel,
      materi: payload.materi,
      durasi: payload.durasi,
      video_ke: payload.video_ke || 1,
      skor_total: skor.total,
      persen_capaian: skor.persen,
      kategori: skor.kategori,
      catatan_tambahan: payload.catatan_tambahan,
      kekuatan: payload.kekuatan,
      area_pengembangan: payload.area_pengembangan,
      rtl: payload.rtl,
      status: payload.status || 'draft',
      updated_at: new Date().toISOString()
    };

    let id = payload.id;
    if (id) {
      const { error } = await sb.from('obs_akademik').update(headerPayload).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await sb.from('obs_akademik').insert([headerPayload]).select().single();
      if (error) throw new Error(error.message);
      id = ins.id;
    }

    await sb.from('obs_akademik_detail').delete().eq('obs_id', id);
    if (detail.length > 0) {
      const rows = detail.map(d => ({ obs_id: id, kode: d.kode, skor: d.skor, catatan: d.catatan }));
      const { error } = await sb.from('obs_akademik_detail').insert(rows);
      if (error) throw new Error(error.message);
    }
    return { id, ...skor };
  }

  async function remove(id) {
    const { error } = await sb.from('obs_akademik').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  return { getInstrumen, hitungSkor, list, get, save, remove };
})();
window.ObsAkademikAPI = ObsAkademikAPI;
