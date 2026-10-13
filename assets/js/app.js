/**
 * SISPA v2 — App Shell
 * Sidebar + Header + Routing + Role Menu
 */

// ===== Inject favicon otomatis ke semua halaman yang load app.js =====
(function injectFavicon() {
  if (document.querySelector('link[rel="icon"]')) return;
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = '/sispa-v2/favicon.svg';
  document.head.appendChild(link);

  const apple = document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = '/sispa-v2/favicon.svg';
  document.head.appendChild(apple);
})();

/* ============================================================
   NAVIGATION CONFIG
   ============================================================ */

const SISPA_NAV = {
  admin: [
    { section: 'Utama' },
    { key: 'dashboard', href: '/sispa-v2/admin/dashboard.html', label: 'Dashboard', icon: 'layout-dashboard' },
    { section: 'Data Master' },
    { key: 'sekolah', href: '/sispa-v2/admin/sekolah.html', label: 'Sekolah', icon: 'building-2' },
    { key: 'users', href: '/sispa-v2/admin/users.html', label: 'Users', icon: 'users' },
    { key: 'guru', href: '/sispa-v2/admin/guru.html', label: 'Guru', icon: 'graduation-cap' },
    { section: 'Sistem' },
    { key: 'audit', href: '/sispa-v2/admin/audit.html', label: 'Audit Log', icon: 'activity' },
    { key: 'pengaturan', href: '/sispa-v2/admin/pengaturan.html', label: 'Pengaturan', icon: 'settings' }
  ],
  pengawas: [
    { section: 'Utama' },
    { key: 'dashboard', href: '/sispa-v2/pengawas/dashboard.html', label: 'Dashboard', icon: 'layout-dashboard' },
    { section: 'Monitoring' },
    { key: 'profil-guru', href: '/sispa-v2/pengawas/profil-guru.html', label: 'Profil Guru', icon: 'compass' },
    { key: 'program', href: '/sispa-v2/pengawas/program.html', label: 'Program Supervisi', icon: 'clipboard-list' },
    { key: 'supervisi', href: '/sispa-v2/pengawas/supervisi.html', label: 'Semua Supervisi', icon: 'clipboard-check' },
    { section: 'Evaluasi' },
    { key: 'evaluasi', href: '/sispa-v2/pengawas/evaluasi-list.html', label: 'Evaluasi Kinerja KS', icon: 'gauge' }
  ],
  ks: [
    { section: 'Utama' },
    { key: 'dashboard', href: '/sispa-v2/ks/dashboard.html', label: 'Dashboard', icon: 'layout-dashboard' },
    { section: 'Data' },
    { key: 'guru', href: '/sispa-v2/ks/guru.html', label: 'Data Guru', icon: 'users' },
    { key: 'profil-guru', href: '/sispa-v2/ks/profil-guru.html', label: 'Profil Tipe Guru', icon: 'compass' },
    { section: 'Supervisi' },
    { key: 'program', href: '/sispa-v2/ks/program.html', label: 'Program Supervisi', icon: 'clipboard-list' },
    { key: 'pelaksanaan', href: '/sispa-v2/ks/pelaksanaan.html', label: 'Pelaksanaan', icon: 'play-circle' },
    { key: 'riwayat', href: '/sispa-v2/ks/riwayat.html', label: 'Riwayat', icon: 'history' },
    { section: 'Analitik' },
    { key: 'analisis', href: '/sispa-v2/ks/analisis.html', label: 'Analisis PM & KKA', icon: 'bar-chart-3' },
    { section: 'Akun' },
    { key: 'profil', href: '/sispa-v2/ks/profil.html', label: 'Profil Saya', icon: 'user-circle' }
  ],
  guru: [
    { section: 'Utama' },
    { key: 'dashboard', href: '/sispa-v2/guru/dashboard.html', label: 'Dashboard', icon: 'layout-dashboard' },
    { section: 'Supervisi Saya' },
    { key: 'riwayat', href: '/sispa-v2/guru/riwayat.html', label: 'Riwayat Supervisi', icon: 'history' },
    { key: 'rtl', href: '/sispa-v2/guru/rtl.html', label: 'Rencana Tindak Lanjut', icon: 'target' }
  ]
};

const SISPA_ROLE_LABEL = {
  admin: 'Administrator',
  pengawas: 'Pengawas',
  ks: 'Kepala Sekolah',
  guru: 'Guru'
};

/* ============================================================
   BUILD SIDEBAR
   ============================================================ */

function buildSidebar(user, activeKey) {
  const items = SISPA_NAV[user.role] || [];
  const navHtml = items.map(item => {
    if (item.section) return `<div class="sidebar-section-title">${item.section}</div>`;
    const active = item.key === activeKey ? 'active' : '';
    return `
      <a href="${item.href}" class="nav-item ${active}">
        ${icon(item.icon, 'w-5 h-5')}
        <span>${item.label}</span>
      </a>`;
  }).join('');

  const roleLabel = SISPA_ROLE_LABEL[user.role] || user.role;
  const initial = (user.nama || user.email || 'U').charAt(0).toUpperCase();

  return `
    <aside id="appSidebar" class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-logo">${icon('graduation-cap', 'w-5 h-5')}</div>
        <div style="flex:1; min-width:0">
          <div style="font-weight:600; color:var(--slate-900); font-size:0.875rem; line-height:1.2">SISPA</div>
          <div style="font-size:0.75rem; color:var(--slate-500); overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            ${escapeHtml(user.nama_sekolah || user.npsn || 'SISPA')}
          </div>
        </div>
        <button id="sidebarClose" class="icon-btn" style="display:none" title="Tutup">${icon('x', 'w-5 h-5')}</button>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <div style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem">
          <div style="width:36px; height:36px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:0.875rem; background:var(--brand-100); color:var(--brand-700)">
            ${escapeHtml(initial)}
          </div>
          <div style="flex:1; min-width:0">
            <div style="font-size:0.75rem; font-weight:500; color:var(--slate-900); overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
              ${escapeHtml(user.nama || user.email || 'User')}
            </div>
            <div style="font-size:0.75rem; color:var(--slate-500)">${roleLabel}</div>
          </div>
        </div>
      </div>
    </aside>
    <div id="sidebarOverlay" class="overlay"></div>`;
}

/* ============================================================
   BUILD HEADER
   ============================================================ */

function buildHeader(user) {
  const roleLabel = SISPA_ROLE_LABEL[user.role] || user.role;
  const initial = (user.nama || user.email || 'U').charAt(0).toUpperCase();

  return `
    <header class="header">
      <button id="menuBtn" class="icon-btn" title="Menu">${icon('menu', 'w-5 h-5')}</button>
      <div style="flex:1; min-width:0">
        <div style="font-size:0.875rem; font-weight:500; color:var(--slate-500)">
          ${user.npsn ? 'NPSN <span class="text-mono">' + escapeHtml(user.npsn) + '</span>' : escapeHtml(user.email || '')}
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem">
        <div style="text-align:right; display:none" class="hidden md:block">
          <div style="font-size:0.75rem; font-weight:500; color:var(--slate-900); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px">
            ${escapeHtml(user.nama_sekolah || user.nama || '')}
          </div>
          <div style="font-size:0.75rem; color:var(--slate-500)">${roleLabel}</div>
        </div>
        <button id="profileBtn" style="display:flex; align-items:center; gap:0.5rem; padding:0.25rem 0.5rem 0.25rem 0.25rem; border-radius:999px; border:none; background:transparent; cursor:pointer" title="Menu Akun">
          <div style="width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:0.875rem; background:var(--brand-100); color:var(--brand-700)">
            ${escapeHtml(initial)}
          </div>
        </button>
      </div>
    </header>`;
}

/* ============================================================
   PROFILE MENU
   ============================================================ */

function openProfileMenu(anchorBtn) {
  closeProfileMenu();
  const user = (typeof getCurrentUserCached === 'function') ? getCurrentUserCached() : null;
  if (!user) return;

  const roleLabel = SISPA_ROLE_LABEL[user.role] || user.role;
  const rect = anchorBtn.getBoundingClientRect();

  const menu = document.createElement('div');
  menu.id = 'profileMenu';
  menu.style.cssText = [
    'position:fixed',
    'z-index:200',
    'background:#fff',
    'border:1px solid var(--slate-200)',
    'border-radius:12px',
    'box-shadow:var(--shadow-lg)',
    'padding:6px',
    'min-width:240px',
    'font-size:14px',
    'top:' + (rect.bottom + 8) + 'px',
    'right:' + Math.max(8, window.innerWidth - rect.right) + 'px'
  ].join(';');

  menu.innerHTML = `
    <div style="padding:0.75rem; border-bottom:1px solid var(--slate-100); margin-bottom:0.25rem">
      <div style="font-weight:600; font-size:0.875rem; color:var(--slate-900); overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
        ${escapeHtml(user.nama || user.email || '(Belum diisi)')}
      </div>
      <div style="font-size:0.75rem; color:var(--slate-500); margin-top:0.125rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
        ${escapeHtml(user.nama_sekolah || user.npsn || '')}
      </div>
      <div style="font-size:0.75rem; color:var(--slate-400); margin-top:0.125rem">${roleLabel}</div>
    </div>
    <button id="profileLogoutBtn" class="nav-item" style="width:100%; border:none; background:transparent; color:var(--danger); text-align:left; border-radius:8px; cursor:pointer">
      ${icon('log-out', 'w-4 h-4')}<span>Keluar</span>
    </button>`;

  document.body.appendChild(menu);
  refreshIcons();

  setTimeout(() => {
    document.addEventListener('click', closeProfileMenuOnOutside, { once: true });
  }, 50);

  document.getElementById('profileLogoutBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    closeProfileMenu();
    const ok = await confirmAction('Keluar dari SISPA?', 'Anda akan diminta login kembali.', {
      confirmText: 'Ya, keluar', danger: true
    });
    if (!ok) return;
    await logout();
  });

  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeProfileMenu));
}

function closeProfileMenu() {
  const m = document.getElementById('profileMenu');
  if (m) m.remove();
}

function closeProfileMenuOnOutside(e) {
  const menu = document.getElementById('profileMenu');
  if (!menu) return;
  const btn = document.getElementById('profileBtn');
  if (menu.contains(e.target)) return;
  if (btn && btn.contains(e.target)) return;
  closeProfileMenu();
}

/* ============================================================
   MOUNT SHELL
   ============================================================ */

let _currentUser = null;

function getCurrentUserCached() {
  return _currentUser;
}

function mountShell(user, activeKey) {
  if (!user) {
    console.error('[SISPA] mountShell: user tidak ada');
    return;
  }

  _currentUser = user;

  // Cegah mount ganda
  if (document.getElementById('sispaShell')) return;

  // Kumpulkan konten halaman (kecuali script)
  const bodyChildren = Array.from(document.body.childNodes);
  const contentNodes = [];
  bodyChildren.forEach(n => {
    if (n.nodeType === 1 && n.tagName === 'SCRIPT') return;
    if (n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())) {
      contentNodes.push(n);
    }
  });

  // Bangun shell
  const shell = document.createElement('div');
  shell.id = 'sispaShell';
  shell.innerHTML = `
    ${buildSidebar(user, activeKey)}
    <div class="app-content">
      ${buildHeader(user)}
      <main id="appMain" class="app-main"></main>
    </div>`;

  const main = shell.querySelector('#appMain');
  contentNodes.forEach(n => main.appendChild(n));

  document.body.insertBefore(shell, document.body.firstChild);
  refreshIcons();

  // Responsive: sidebar selalu tampil di desktop
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('sidebarClose');
  const profileBtn = document.getElementById('profileBtn');

  function updateSidebarUI() {
    if (window.innerWidth >= 1024) {
      if (closeBtn) closeBtn.style.display = 'none';
    } else {
      if (closeBtn) closeBtn.style.display = 'inline-flex';
    }
  }
  updateSidebarUI();
  window.addEventListener('resize', updateSidebarUI);

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  }

  if (menuBtn) menuBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openProfileMenu(profileBtn);
    });
  }
}

/* ============================================================
   INIT PAGE — Helper untuk halaman
   ============================================================ */

/**
 * Panggil di setiap halaman:
 *   initPage('admin', 'dashboard', (user) => { ... })
 *
 * @param {String} requiredRole - role yang diperlukan
 * @param {String} activeKey - key menu aktif
 * @param {Function} onReady - callback setelah shell di-mount
 */
async function initPage(requiredRole, activeKey, onReady) {
  try {
    const profile = await requireAuth([requiredRole]);
    if (!profile) return;

    // Simpan ke cache
    _currentUser = profile;

    // Kalau contentNode belum ada, tunggu DOM siap
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        mountShell(profile, activeKey);
        if (typeof onReady === 'function') onReady(profile);
      });
    } else {
      mountShell(profile, activeKey);
      if (typeof onReady === 'function') onReady(profile);
    }
  } catch (err) {
    console.error('[SISPA] initPage error:', err);
    document.body.innerHTML = `
      <div style="padding:2rem; text-align:center; font-family:sans-serif">
        <h2 style="color:#dc2626">Gagal memuat halaman</h2>
        <p style="color:#64748b">${escapeHtml(err.message || String(err))}</p>
        <a href="/sispa-v2/index.html" style="color:#4f46e5">Kembali ke Login</a>
      </div>`;
  }
}

/* ============================================================
   EXPORT
   ============================================================ */

window.SISPA_NAV = SISPA_NAV;
window.SISPA_ROLE_LABEL = SISPA_ROLE_LABEL;
window.mountShell = mountShell;
window.initPage = initPage;
window.openProfileMenu = openProfileMenu;
window.closeProfileMenu = closeProfileMenu;
window.getCurrentUserCached = getCurrentUserCached;
