/**
 * SISPA v2 — API Sekolah
 * Wrapper query ke tabel `sekolah`
 */

const SekolahAPI = (function () {

  async function list(opts = {}) {
    let query = sb.from('sekolah').select('*');

    if (opts.q) {
      query = query.or(`nama.ilike.%${opts.q}%,npsn.ilike.%${opts.q}%,kecamatan.ilike.%${opts.q}%`);
    }
    if (opts.jenjang) query = query.eq('jenjang', opts.jenjang);
    if (opts.status) query = query.eq('status', opts.status);

    query = query.order('nama', { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function get(npsn) {
    const { data, error } = await sb
      .from('sekolah')
      .select('*')
      .eq('npsn', npsn)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function create(payload) {
    // Validasi
    if (!payload.npsn) throw new Error('NPSN wajib diisi');
    if (!/^\d{8}$/.test(payload.npsn)) throw new Error('NPSN harus 8 digit angka');
    if (!payload.nama) throw new Error('Nama sekolah wajib diisi');
    if (!payload.jenjang) throw new Error('Jenjang wajib diisi');

    // Cek duplikat
    const { data: existing } = await sb
      .from('sekolah')
      .select('npsn')
      .eq('npsn', payload.npsn)
      .maybeSingle();

    if (existing) throw new Error('NPSN sudah terdaftar');

    const { data, error } = await sb
      .from('sekolah')
      .insert([{
        npsn: payload.npsn,
        nama: payload.nama,
        jenjang: payload.jenjang,
        kecamatan: payload.kecamatan || null,
        kabupaten: payload.kabupaten || null,
        provinsi: payload.provinsi || null,
        alamat: payload.alamat || null,
        telepon: payload.telepon || null,
        email: payload.email || null,
        logo_url: payload.logo_url || null,
        status: 'aktif'
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function update(npsn, payload) {
    if (!payload.nama) throw new Error('Nama sekolah wajib diisi');
    if (!payload.jenjang) throw new Error('Jenjang wajib diisi');

    const { data, error } = await sb
      .from('sekolah')
      .update({
        nama: payload.nama,
        jenjang: payload.jenjang,
        kecamatan: payload.kecamatan || null,
        kabupaten: payload.kabupaten || null,
        provinsi: payload.provinsi || null,
        alamat: payload.alamat || null,
        telepon: payload.telepon || null,
        email: payload.email || null,
        logo_url: payload.logo_url || null,
        status: payload.status || 'aktif'
      })
      .eq('npsn', npsn)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function softDelete(npsn) {
    const { data, error } = await sb
      .from('sekolah')
      .update({ status: 'nonaktif' })
      .eq('npsn', npsn)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function hardDelete(npsn) {
    // Cek referensi
    const [guru, profiles, supervisi] = await Promise.all([
      sb.from('guru').select('id', { count: 'exact', head: true }).eq('npsn_sekolah', npsn).eq('status', 'aktif'),
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('npsn', npsn),
      sb.from('supervisi').select('id', { count: 'exact', head: true }).eq('npsn_sekolah', npsn)
    ]);

    const blockers = [];
    if (guru.count > 0) blockers.push(`${guru.count} guru aktif`);
    if (profiles.count > 0) blockers.push(`${profiles.count} user`);
    if (supervisi.count > 0) blockers.push(`${supervisi.count} data supervisi`);

    if (blockers.length > 0) {
      throw new Error('Tidak dapat hapus permanen: masih ada ' + blockers.join(', '));
    }

    const { error } = await sb.from('sekolah').delete().eq('npsn', npsn);
    if (error) throw new Error(error.message);
    return true;
  }

  async function stats() {
    const { data, error } = await sb.from('sekolah').select('jenjang, status');
    if (error) throw new Error(error.message);

    const result = {
      total: data.length,
      aktif: data.filter(s => s.status === 'aktif').length,
      nonaktif: data.filter(s => s.status === 'nonaktif').length,
      jenjang: {}
    };

    data.forEach(s => {
      result.jenjang[s.jenjang] = (result.jenjang[s.jenjang] || 0) + 1;
    });

    return result;
  }

  async function importBulk(list) {
    if (!Array.isArray(list) || list.length === 0) throw new Error('Data kosong');
    if (list.length > 500) throw new Error('Maksimal 500 sekolah per impor');

    const errors = [];
    const rows = [];

    list.forEach((item, i) => {
      const npsn = String(item.npsn || '').trim();
      const nama = (item.nama || '').trim();
      const jenjang = (item.jenjang || '').trim();

      if (!/^\d{8}$/.test(npsn)) {
        errors.push({ line: i + 1, message: 'NPSN tidak valid (harus 8 digit)' });
        return;
      }
      if (!nama) {
        errors.push({ line: i + 1, message: 'Nama sekolah kosong' });
        return;
      }
      if (!jenjang) {
        errors.push({ line: i + 1, message: 'Jenjang kosong' });
        return;
      }

      rows.push({
        npsn: npsn,
        nama: nama,
        jenjang: jenjang,
        kecamatan: (item.kecamatan || '').trim() || null,
        kabupaten: (item.kabupaten || '').trim() || null,
        provinsi: (item.provinsi || '').trim() || null,
        alamat: (item.alamat || '').trim() || null,
        telepon: (item.telepon || '').trim() || null,
        email: (item.email || '').trim() || null,
        status: (item.status || 'aktif').trim().toLowerCase()
      });
    });

    if (rows.length === 0) return { inserted: 0, errors };

    const { data, error } = await sb.from('sekolah').insert(rows).select('npsn');
    if (error) {
      // Jika error unique constraint NPSN (duplikat)
      if (error.code === '23505') {
        throw new Error('Beberapa NPSN sudah terdaftar di database. Periksa kembali file Anda.');
      }
      throw new Error(error.message);
    }

    return { inserted: data.length, errors };
  }

  return { list, get, create, update, softDelete, hardDelete, stats, importBulk };
})();

window.SekolahAPI = SekolahAPI;
