/**
 * SISPA v2 — API Program Supervisi
 * Menyusun rencana supervisi per periode (Tabel 9 Modul 5)
 */

const ProgramAPI = (function () {

  function getPeriodeDefault() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    if (m >= 7) return y + '/' + (y+1) + '-Ganjil';
    return (y-1) + '/' + y + '-Genap';
  }

  async function list(opts = {}) {
    let query = sb
      .from('program_supervisi')
      .select('*, guru:guru(id, nama, nip, mapel, kelas), sekolah:sekolah(nama)');

    if (opts.npsn_sekolah) query = query.eq('npsn_sekolah', opts.npsn_sekolah);
    if (opts.periode) query = query.eq('periode', opts.periode);
    if (opts.guru_id) query = query.eq('guru_id', opts.guru_id);

    query = query.order('waktu_rencana', { ascending: true, nullsFirst: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Buat / perbarui program supervisi.
   * Satu guru hanya punya 1 baris per periode (UNIQUE constraint).
   */
  async function upsert(payload) {
    if (!payload.guru_id) throw new Error('Guru wajib diisi');
    if (!payload.npsn_sekolah) throw new Error('Sekolah wajib diisi');
    if (!payload.periode) throw new Error('Periode wajib diisi');

    // Cek apakah sudah ada
    const { data: existing } = await sb
      .from('program_supervisi')
      .select('id')
      .eq('guru_id', payload.guru_id)
      .eq('periode', payload.periode)
      .maybeSingle();

    const record = {
      npsn_sekolah: payload.npsn_sekolah,
      periode: payload.periode,
      guru_id: payload.guru_id,
      level_abstraksi: payload.level_abstraksi || null,
      level_komitmen: payload.level_komitmen || null,
      tipe: payload.tipe || null,
      pendekatan: payload.pendekatan || null,
      waktu_rencana: payload.waktu_rencana || null
    };

    if (existing) {
      const { data, error } = await sb
        .from('program_supervisi')
        .update(record)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const { data, error } = await sb
      .from('program_supervisi')
      .insert([record])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function remove(id) {
    const { error } = await sb.from('program_supervisi').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  /**
   * Kandidat guru untuk dijadwalkan: guru aktif yang belum ada di program periode ini.
   */
  async function kandidatGuru(npsnSekolah, periode) {
    const { data: guruList, error: errGuru } = await sb
      .from('guru')
      .select('id, nama, nip, mapel, kelas')
      .eq('npsn_sekolah', npsnSekolah)
      .eq('status', 'aktif')
      .order('nama');
    if (errGuru) throw new Error(errGuru.message);

    const { data: programList, error: errProg } = await sb
      .from('program_supervisi')
      .select('guru_id')
      .eq('npsn_sekolah', npsnSekolah)
      .eq('periode', periode);
    if (errProg) throw new Error(errProg.message);

    const sudah = new Set((programList || []).map(p => p.guru_id));
    return (guruList || []).filter(g => !sudah.has(g.id));
  }

  return { list, upsert, remove, kandidatGuru, getPeriodeDefault };
})();

window.ProgramAPI = ProgramAPI;
