/**
 * SISPA v2 — API Profil Tipe Guru
 * Berdasarkan Glickman (2002) & Modul 5
 */

const ProfilTipeAPI = (function () {

  // Mapping kuadran → tipe → pendekatan
  const MAPPING = {
    'rendah-rendah': {
      tipe: 'dropout',
      label: 'Dropout',
      pendekatan: 'directive_control',
      pendekatan_label: 'Directive-Control',
      teknik: 'mentoring',
      deskripsi: 'Guru dengan komitmen & abstraksi rendah. Butuh arahan langsung yang ketat.',
      kuadran: 'I'
    },
    'tinggi-rendah': {
      tipe: 'unfocused_worker',
      label: 'Unfocused Worker',
      pendekatan: 'directive_informational',
      pendekatan_label: 'Directive-Informational',
      teknik: 'mentoring',
      deskripsi: 'Komitmen tinggi, abstraksi rendah. Butuh pilihan solusi terbatas.',
      kuadran: 'II'
    },
    'rendah-tinggi': {
      tipe: 'analytical_observer',
      label: 'Analytical Observer',
      pendekatan: 'collaborative',
      pendekatan_label: 'Collaborative',
      teknik: 'coaching',
      deskripsi: 'Komitmen rendah, abstraksi tinggi. Butuh kolaborasi untuk bangun komitmen.',
      kuadran: 'III'
    },
    'tinggi-tinggi': {
      tipe: 'professional',
      label: 'Professional',
      pendekatan: 'non_directive',
      pendekatan_label: 'Non-Directive',
      teknik: 'coaching',
      deskripsi: 'Komitmen & abstraksi tinggi. Beri kebebasan, fasilitasi dengan coaching.',
      kuadran: 'IV'
    }
  };

  function hitungTipe(abstraksi, komitmen) {
    // abstraksi & komitmen: 'tinggi' | 'rendah'
    const key = komitmen + '-' + abstraksi;
    return MAPPING[key] || null;
  }

  function getMapping() {
    return MAPPING;
  }

  async function list(opts = {}) {
    let query = sb
      .from('profil_tipe_guru')
      .select('*, guru:guru(id, nama, nip, mapel, kelas, npsn_sekolah)');

    if (opts.guru_id) query = query.eq('guru_id', opts.guru_id);
    if (opts.periode) query = query.eq('periode', opts.periode);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function listByGuruIds(guruIds) {
    if (!guruIds || guruIds.length === 0) return [];
    const { data, error } = await sb
      .from('profil_tipe_guru')
      .select('*')
      .in('guru_id', guruIds)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function get(id) {
    const { data, error } = await sb
      .from('profil_tipe_guru')
      .select('*, guru:guru(id, nama, nip, mapel, kelas)')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function create(payload) {
    if (!payload.guru_id) throw new Error('Guru wajib dipilih');
    if (!payload.periode) throw new Error('Periode wajib diisi');
    if (!['tinggi', 'rendah'].includes(payload.level_abstraksi)) {
      throw new Error('Level abstraksi tidak valid');
    }
    if (!['tinggi', 'rendah'].includes(payload.level_komitmen)) {
      throw new Error('Level komitmen tidak valid');
    }

    const mapping = hitungTipe(payload.level_abstraksi, payload.level_komitmen);
    if (!mapping) throw new Error('Tidak dapat menentukan tipe guru');

    // Cek apakah sudah ada penilaian untuk guru + periode ini
    const { data: existing } = await sb
      .from('profil_tipe_guru')
      .select('id')
      .eq('guru_id', payload.guru_id)
      .eq('periode', payload.periode)
      .maybeSingle();

    if (existing) {
      throw new Error('Guru sudah dinilai untuk periode ini');
    }

    const { data: session } = await sb.auth.getSession();
    const dinilaiOleh = session?.session?.user?.id || null;

    const { data, error } = await sb
      .from('profil_tipe_guru')
      .insert([{
        guru_id: payload.guru_id,
        periode: payload.periode,
        level_abstraksi: payload.level_abstraksi,
        level_komitmen: payload.level_komitmen,
        tipe: mapping.tipe,
        pendekatan_rekomendasi: mapping.pendekatan,
        catatan_abstraksi: payload.catatan_abstraksi || null,
        catatan_komitmen: payload.catatan_komitmen || null,
        catatan_observasi: payload.catatan_observasi || null,
        gap_teridentifikasi: payload.gap_teridentifikasi || [],
        dinilai_oleh: dinilaiOleh
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { ...data, mapping };
  }

  async function update(id, payload) {
    if (!payload.level_abstraksi || !payload.level_komitmen) {
      throw new Error('Data tidak lengkap');
    }

    const mapping = hitungTipe(payload.level_abstraksi, payload.level_komitmen);
    if (!mapping) throw new Error('Tidak dapat menentukan tipe');

    const { data, error } = await sb
      .from('profil_tipe_guru')
      .update({
        level_abstraksi: payload.level_abstraksi,
        level_komitmen: payload.level_komitmen,
        tipe: mapping.tipe,
        pendekatan_rekomendasi: mapping.pendekatan,
        catatan_abstraksi: payload.catatan_abstraksi || null,
        catatan_komitmen: payload.catatan_komitmen || null,
        catatan_observasi: payload.catatan_observasi || null,
        gap_teridentifikasi: payload.gap_teridentifikasi || []
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { ...data, mapping };
  }

  async function remove(id) {
    const { error } = await sb.from('profil_tipe_guru').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  /**
   * Statistik ringkas untuk sekolah tertentu
   */
  async function stats(npsnSekolah, periode) {
    // Ambil guru di sekolah
    const { data: guruList, error: errGuru } = await sb
      .from('guru')
      .select('id')
      .eq('npsn_sekolah', npsnSekolah)
      .eq('status', 'aktif');
    if (errGuru) throw new Error(errGuru.message);

    const guruIds = (guruList || []).map(g => g.id);
    if (guruIds.length === 0) {
      return { total_guru: 0, sudah_dinilai: 0, belum_dinilai: 0, distribusi: {} };
    }

    let query = sb
      .from('profil_tipe_guru')
      .select('tipe')
      .in('guru_id', guruIds);
    if (periode) query = query.eq('periode', periode);

    const { data: tipeData, error } = await query;
    if (error) throw new Error(error.message);

    const distribusi = { dropout: 0, unfocused_worker: 0, analytical_observer: 0, professional: 0 };
    (tipeData || []).forEach(t => {
      if (distribusi[t.tipe] !== undefined) distribusi[t.tipe]++;
    });

    return {
      total_guru: guruIds.length,
      sudah_dinilai: (tipeData || []).length,
      belum_dinilai: guruIds.length - (tipeData || []).length,
      distribusi
    };
  }

  return { list, listByGuruIds, get, create, update, remove, stats, hitungTipe, getMapping };
})();

window.ProfilTipeAPI = ProfilTipeAPI;
