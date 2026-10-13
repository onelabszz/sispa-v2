/**
 * SISPA v2 — API Evaluasi Kinerja KS
 * Berdasarkan instrumen 30 indikator (3 komponen)
 */

const EvaluasiKsAPI = (function () {

  // ===== INSTRUMEN (30 indikator) =====
  const INSTRUMEN = {
    rencana: {
      label: 'Perencanaan Pembelajaran',
      max: 27,
      indikator: [
        { kode: 'R1', teks: 'Identifikasi Murid: Sesuai kondisi obyektif dan menunjukkan kesiapan belajar' },
        { kode: 'R2', teks: 'Dimensi profil lulusan yang dipilih sesuai dengan materi pembelajaran' },
        { kode: 'R3', teks: 'Tujuan Pembelajaran dikembangkan dari Analisis Capaian Pembelajaran' },
        { kode: 'R4', teks: 'Tujuan pembelajaran jelas, terukur, relevan serta mengandung komponen minimal: kompetensi dan materi' },
        { kode: 'R5', teks: 'Praktek pedagogis sesuai prinsip berkesadaran, bermakna, menggembirakan' },
        { kode: 'R6', teks: 'Kemitraan pembelajaran melibatkan stakeholder pendukung tercapainya tujuan' },
        { kode: 'R7', teks: 'Lingkungan pembelajaran mendukung suasana aman, inklusif, kolaboratif, refleksi' },
        { kode: 'R8', teks: 'Pemanfaatan teknologi/digital mendukung pembelajaran interaktif dan kolaboratif' },
        { kode: 'R9', teks: 'Langkah pembelajaran runtut sesuai pengalaman belajar (Memahami, Mengaplikasi, Merefleksi)' }
      ]
    },
    pelaksanaan: {
      label: 'Pelaksanaan Pembelajaran',
      max: 42,
      indikator: [
        { kode: 'P1',  teks: 'Guru menyampaikan tujuan pembelajaran', tahap: 'memahami' },
        { kode: 'P2',  teks: 'Guru membuka pembelajaran dengan apersepsi dan motivasi', tahap: 'memahami' },
        { kode: 'P3',  teks: 'Menyajikan materi runtut, jelas, menarik', tahap: 'memahami' },
        { kode: 'P4',  teks: 'Memfasilitasi pertanyaan dan penggalian pengetahuan awal', tahap: 'memahami' },
        { kode: 'P5',  teks: 'Mengimplementasikan Prinsip Pembelajaran (Berkesadaran, Bermakna, Menggembirakan)', tahap: 'memahami' },
        { kode: 'P6',  teks: 'Menggunakan media pembelajaran yang relevan dan interaktif', tahap: 'mengaplikasi' },
        { kode: 'P7',  teks: 'Memberikan pengalaman nyata (kontekstualisasi) melalui praktik, proyek, simulasi', tahap: 'mengaplikasi' },
        { kode: 'P8',  teks: 'Melibatkan siswa aktif dalam kolaborasi dan diskusi', tahap: 'mengaplikasi' },
        { kode: 'P9',  teks: 'Mengarahkan berpikir kritis dan kreatif', tahap: 'mengaplikasi' },
        { kode: 'P10', teks: 'Mengimplementasikan Prinsip Pembelajaran (Berkesadaran, Bermakna, Menggembirakan)', tahap: 'mengaplikasi' },
        { kode: 'P11', teks: 'Mengajak murid merefleksikan proses dan hasil belajar', tahap: 'merefleksi' },
        { kode: 'P12', teks: 'Memberikan umpan balik dan rencana tindak lanjut', tahap: 'merefleksi' },
        { kode: 'P13', teks: 'Mengintegrasikan dimensi profil lulusan dalam merefleksikan pembelajaran', tahap: 'merefleksi' },
        { kode: 'P14', teks: 'Mengimplementasikan Prinsip Pembelajaran (Berkesadaran, Bermakna, Menggembirakan)', tahap: 'merefleksi' }
      ]
    },
    asesmen: {
      label: 'Asesmen Pembelajaran',
      max: 21,
      indikator: [
        { kode: 'A1', teks: 'Terdapat Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)' },
        { kode: 'A2', teks: 'Instrumen penilaian sesuai tujuan pembelajaran' },
        { kode: 'A3', teks: 'Penilaian mencakup proses dan hasil belajar' },
        { kode: 'A4', teks: 'Penilaian berorientasi pada dimensi profil lulusan' },
        { kode: 'A5', teks: 'Menggunakan teknik beragam (tes, non-tes, observasi, portofolio)' },
        { kode: 'A6', teks: 'Memberikan umpan balik yang membangun' },
        { kode: 'A7', teks: 'Memanfaatkan hasil asesmen untuk perbaikan pembelajaran' }
      ]
    }
  };

  const LABEL_SKOR = {
    rencana: [
      'Tidak ada',
      'Ada tetapi kurang sesuai',
      'Ada dan cukup sesuai',
      'Ada dan sudah sesuai'
    ],
    pelaksanaan: [
      'Tidak ada',
      'Kurang sesuai',
      'Cukup sesuai',
      'Sudah sesuai'
    ],
    asesmen: [
      'Tidak ada',
      'Kurang sesuai',
      'Cukup sesuai',
      'Sudah sesuai'
    ]
  };

  function getInstrumen() { return INSTRUMEN; }
  function getLabelSkor(komponen) { return LABEL_SKOR[komponen] || []; }

  // ===== HITUNG SKOR =====
  function hitungSkor(detail) {
    const skorRencana = detail.filter(d => d.komponen === 'rencana')
      .reduce((s, d) => s + (d.skor || 0), 0);
    const skorPelaksanaan = detail.filter(d => d.komponen === 'pelaksanaan')
      .reduce((s, d) => s + (d.skor || 0), 0);
    const skorAsesmen = detail.filter(d => d.komponen === 'asesmen')
      .reduce((s, d) => s + (d.skor || 0), 0);
    const skorTotal = skorRencana + skorPelaksanaan + skorAsesmen;

    const maxTotal = INSTRUMEN.rencana.max + INSTRUMEN.pelaksanaan.max + INSTRUMEN.asesmen.max; // 90
    const persen = maxTotal > 0 ? (skorTotal / maxTotal) * 100 : 0;

    let predikat;
    if (persen >= 91) predikat = 'Sangat Baik';
    else if (persen >= 80) predikat = 'Baik';
    else if (persen >= 71) predikat = 'Cukup';
    else predikat = 'Kurang';

    return {
      skor_rencana: skorRencana,
      skor_pelaksanaan: skorPelaksanaan,
      skor_asesmen: skorAsesmen,
      skor_total: skorTotal,
      persen_capaian: Math.round(persen * 100) / 100,
      predikat
    };
  }

  // ===== LIST =====
  async function list(opts = {}) {
    let query = sb
      .from('evaluasi_ks')
      .select(`
        *,
        sekolah:sekolah(nama),
        ks:profiles!evaluasi_ks_ks_id_fkey(id, nama, email),
        pengawas:profiles!evaluasi_ks_pengawas_id_fkey(id, nama, email)
      `);

    if (opts.npsn_sekolah) query = query.eq('npsn_sekolah', opts.npsn_sekolah);
    if (opts.ks_id) query = query.eq('ks_id', opts.ks_id);
    if (opts.pengawas_id) query = query.eq('pengawas_id', opts.pengawas_id);
    if (opts.periode) query = query.eq('periode', opts.periode);
    if (opts.status) query = query.eq('status', opts.status);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map(e => ({
      ...e,
      nama_sekolah: e.sekolah?.nama || null,
      nama_ks: e.ks?.nama || null,
      nama_pengawas: e.pengawas?.nama || null
    }));
  }

  // ===== GET (header + detail) =====
  async function get(id) {
    const { data: header, error: e1 } = await sb
      .from('evaluasi_ks')
      .select(`
        *,
        sekolah:sekolah(nama, jenjang, kecamatan, kabupaten, provinsi, alamat),
        ks:profiles!evaluasi_ks_ks_id_fkey(id, nama, email, nip, jabatan, pangkat_golongan),
        pengawas:profiles!evaluasi_ks_pengawas_id_fkey(id, nama, email, nip, jabatan, pangkat_golongan)
      `)
      .eq('id', id)
      .single();
    if (e1) throw new Error(e1.message);

    const { data: detail, error: e2 } = await sb
      .from('evaluasi_ks_detail')
      .select('*')
      .eq('evaluasi_id', id)
      .order('kode', { ascending: true });
    if (e2) throw new Error(e2.message);

    return {
      header: {
        ...header,
        nama_sekolah: header.sekolah?.nama || null,
        nama_ks: header.ks?.nama || null,
        nama_pengawas: header.pengawas?.nama || null
      },
      detail: detail || [],
      instrumen: INSTRUMEN
    };
  }

  // ===== SAVE (upsert header + detail) =====
  async function save(payload) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sesi tidak valid');

    if (!payload.npsn_sekolah) throw new Error('Sekolah wajib diisi');
    if (!payload.ks_id) throw new Error('KS yang dinilai wajib dipilih');
    if (!payload.periode) throw new Error('Periode wajib diisi');
    if (!payload.tanggal) throw new Error('Tanggal evaluasi wajib diisi');

    const detail = Array.isArray(payload.detail) ? payload.detail : [];
    if (detail.length === 0) throw new Error('Detail evaluasi kosong');

    // Validasi setiap skor
    detail.forEach(d => {
      if (d.skor == null || d.skor < 0 || d.skor > 3) {
        throw new Error(`Skor ${d.kode} harus 0–3`);
      }
    });

    const skor = hitungSkor(detail);

    let id = payload.id;
    let existing = id ? { id } : null;

    const headerPayload = {
      npsn_sekolah: payload.npsn_sekolah,
      ks_id: payload.ks_id,
      pengawas_id: session.user.id,
      periode: payload.periode,
      tanggal: payload.tanggal,
      status: payload.status || 'draft',
      skor_rencana: skor.skor_rencana,
      skor_pelaksanaan: skor.skor_pelaksanaan,
      skor_asesmen: skor.skor_asesmen,
      skor_total: skor.skor_total,
      persen_capaian: skor.persen_capaian,
      predikat: skor.predikat,
      catatan_rencana: payload.catatan_rencana || null,
      catatan_pelaksanaan: payload.catatan_pelaksanaan || null,
      catatan_asesmen: payload.catatan_asesmen || null,
      rtl: payload.rtl || null,
      sumber_data: payload.sumber_data ? JSON.stringify(payload.sumber_data) : null,
      link_dokumentasi: payload.link_dokumentasi || null,
      ttd_pengawas: payload.ttd_pengawas || null,
      ttd_ks: payload.ttd_ks || null,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      // Cek status
      const { data: cur } = await sb
        .from('evaluasi_ks')
        .select('status')
        .eq('id', id)
        .single();
      if (cur && cur.status === 'final') {
        throw new Error('Evaluasi sudah final, tidak dapat diubah');
      }

      const { error } = await sb
        .from('evaluasi_ks')
        .update(headerPayload)
        .eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      // Insert header
      const { data: ins, error } = await sb
        .from('evaluasi_ks')
        .insert([headerPayload])
        .select()
        .single();
      if (error) throw new Error(error.message);
      id = ins.id;
    }

    // Ganti detail: hapus lama, insert baru (via upsert)
    await sb.from('evaluasi_ks_detail').delete().eq('evaluasi_id', id);

    const detailRows = detail.map(d => ({
      evaluasi_id: id,
      komponen: d.komponen,
      kode: d.kode,
      skor: d.skor,
      catatan: d.catatan || null
    }));

    const { error: errD } = await sb.from('evaluasi_ks_detail').insert(detailRows);
    if (errD) throw new Error(errD.message);

    return { id, ...skor };
  }

  async function remove(id) {
    const { error } = await sb.from('evaluasi_ks').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  async function stats(opts = {}) {
    let query = sb.from('evaluasi_ks').select('status, predikat');
    if (opts.npsn_sekolah) query = query.eq('npsn_sekolah', opts.npsn_sekolah);
    if (opts.pengawas_id) query = query.eq('pengawas_id', opts.pengawas_id);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const s = {
      total: data.length,
      draft: 0,
      final: 0,
      sangat_baik: 0,
      baik: 0,
      cukup: 0,
      kurang: 0
    };
    data.forEach(x => {
      if (x.status === 'draft') s.draft++;
      else if (x.status === 'final') s.final++;

      const p = (x.predikat || '').toLowerCase().replace(/\s+/g, '_');
      if (s[p] !== undefined) s[p]++;
    });
    return s;
  }

  return { getInstrumen, getLabelSkor, hitungSkor, list, get, save, remove, stats };
})();

window.EvaluasiKsAPI = EvaluasiKsAPI;
