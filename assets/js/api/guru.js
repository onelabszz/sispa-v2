/**
 * SISPA v2 — API Guru
 */

const GuruAPI = (function () {

  async function list(opts = {}) {
    let query = sb
      .from('guru')
      .select('*, sekolah:sekolah(nama)')
      .eq('status', 'aktif'); // sembunyikan yang dihapus

    if (opts.q) {
      query = query.or(`nama.ilike.%${opts.q}%,nip.ilike.%${opts.q}%,mapel.ilike.%${opts.q}%`);
    }
    if (opts.npsn_sekolah) query = query.eq('npsn_sekolah', opts.npsn_sekolah);
    if (opts.status_kepegawaian) query = query.eq('status_kepegawaian', opts.status_kepegawaian);
    if (opts.kelas) query = query.eq('kelas', opts.kelas);

    query = query.order('nama', { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map(g => ({
      ...g,
      nama_sekolah: g.sekolah?.nama || null
    }));
  }

  async function get(id) {
    const { data, error } = await sb
      .from('guru')
      .select('*, sekolah:sekolah(nama)')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return { ...data, nama_sekolah: data.sekolah?.nama || null };
  }

  async function create(payload) {
    if (!payload.npsn_sekolah) throw new Error('Sekolah wajib dipilih');
    if (!payload.nama || !payload.nama.trim()) throw new Error('Nama guru wajib diisi');

    const { data, error } = await sb
      .from('guru')
      .insert([{
        npsn_sekolah: payload.npsn_sekolah,
        nip: payload.nip || null,
        nama: payload.nama.trim(),
        mapel: payload.mapel || null,
        kelas: payload.kelas || null,
        email: payload.email || null,
        status_kepegawaian: payload.status_kepegawaian || null,
        status: 'aktif'
      }])
      .select()
      .single();

    if (error) {
      // Tangani error unique constraint NIP
      if (error.code === '23505') {
        throw new Error('NIP sudah terdaftar di sekolah ini');
      }
      throw new Error(error.message);
    }
    return data;
  }

  async function update(id, payload) {
    if (!payload.nama || !payload.nama.trim()) throw new Error('Nama guru wajib diisi');

    const { data, error } = await sb
      .from('guru')
      .update({
        nip: payload.nip || null,
        nama: payload.nama.trim(),
        mapel: payload.mapel || null,
        kelas: payload.kelas || null,
        email: payload.email || null,
        status_kepegawaian: payload.status_kepegawaian || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('NIP sudah terdaftar di sekolah ini');
      }
      throw new Error(error.message);
    }
    return data;
  }

  async function softDelete(id) {
    const { data, error } = await sb
      .from('guru')
      .update({ status: 'hapus', deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function stats() {
    const { data, error } = await sb
      .from('guru')
      .select('status_kepegawaian, npsn_sekolah')
      .eq('status', 'aktif');
    if (error) throw new Error(error.message);

    const result = {
      total: data.length,
      pns: 0, pppk: 0, nonAsn: 0,
      sekolahUnik: new Set()
    };

    data.forEach(g => {
      if (g.status_kepegawaian === 'PNS') result.pns++;
      else if (g.status_kepegawaian === 'PPPK') result.pppk++;
      else if (g.status_kepegawaian === 'Non ASN') result.nonAsn++;
      result.sekolahUnik.add(g.npsn_sekolah);
    });

    result.sekolahUnik = result.sekolahUnik.size;
    return result;
  }

  /**
   * Impor massal dari array of object
   * Format: [{ nip, nama, mapel, kelas, email, status_kepegawaian }]
   */
  async function importBulk(npsnSekolah, list) {
    if (!npsnSekolah) throw new Error('Sekolah wajib dipilih');
    if (!Array.isArray(list) || list.length === 0) throw new Error('Data kosong');
    if (list.length > 500) throw new Error('Maksimal 500 guru per impor');

    const errors = [];
    const rows = [];

    list.forEach((item, i) => {
      const nama = (item.nama || '').trim();
      if (!nama) {
        errors.push({ line: i + 1, message: 'Nama kosong' });
        return;
      }

      const statusPeg = (item.status_kepegawaian || '').trim();
      const validStatus = ['PNS', 'PPPK', 'Non ASN'];
      if (statusPeg && !validStatus.includes(statusPeg)) {
        errors.push({ line: i + 1, message: 'Status tidak valid: ' + statusPeg });
        return;
      }

      rows.push({
        npsn_sekolah: npsnSekolah,
        nip: (item.nip || '').trim() || null,
        nama: nama,
        mapel: (item.mapel || '').trim() || null,
        kelas: (item.kelas || '').trim() || null,
        email: (item.email || '').trim() || null,
        status_kepegawaian: statusPeg || null,
        status: 'aktif'
      });
    });

    if (rows.length === 0) {
      return { inserted: 0, errors };
    }

    const { data, error } = await sb.from('guru').insert(rows).select('id');
    if (error) {
      throw new Error('Impor gagal: ' + error.message);
    }

    return {
      inserted: data.length,
      errors
    };
  }

  return { list, get, create, update, softDelete, stats, importBulk };
})();

window.GuruAPI = GuruAPI;
