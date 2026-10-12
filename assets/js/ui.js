/**
 * SISPA v2 — UI Helpers
 * Toast, modal, loading, ikon, util
 */

/* ============================================================
   ICONS (Lucide)
   ============================================================ */

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
    return;
  }
  let attempts = 0;
  const tryCreate = () => {
    if (window.lucide) window.lucide.createIcons();
    else if (attempts++ < 20) setTimeout(tryCreate, 100);
  };
  tryCreate();
}

function icon(name, cls) {
  return `<i data-lucide="${name}" class="${cls || 'w-5 h-5'}"></i>`;
}

/* ============================================================
   TOAST
   ============================================================ */

function showToast(msg, type = 'info') {
  const cls = type === 'success' ? 'toast-success'
            : type === 'error'   ? 'toast-error'
            : type === 'warning' ? 'toast-warning'
            : 'toast-info';
  const ic  = type === 'success' ? 'check-circle'
            : type === 'error'   ? 'alert-circle'
            : type === 'warning' ? 'alert-triangle'
            : 'info';

  const div = document.createElement('div');
  div.className = 'toast ' + cls;
  div.innerHTML = `${icon(ic, 'w-4 h-4')}<span>${escapeHtml(msg)}</span>`;
  document.body.appendChild(div);
  refreshIcons();

  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transform = 'translateY(8px)';
    div.style.transition = 'all .25s ease';
    setTimeout(() => div.remove(), 250);
  }, 3200);
}

/* ============================================================
   LOADING
   ============================================================ */

function showLoading(msg) {
  if (document.getElementById('sispaLoading')) return;
  const div = document.createElement('div');
  div.id = 'sispaLoading';
  div.className = 'loading-overlay';
  div.innerHTML = `
    <div style="text-align:center">
      <div class="spinner" style="margin: 0 auto 12px"></div>
      <div style="font-size: 14px; color: var(--slate-600)">${escapeHtml(msg || 'Memuat...')}</div>
    </div>`;
  document.body.appendChild(div);
}

function hideLoading() {
  const el = document.getElementById('sispaLoading');
  if (el) el.remove();
}

async function withLoading(msg, fn) {
  showLoading(msg);
  try { return await fn(); }
  finally { hideLoading(); }
}

/* ============================================================
   MODAL
   ============================================================ */

function openModal(opts) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.id = 'sispaModal';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal-panel" style="${opts.maxWidth ? 'max-width:' + opts.maxWidth + ';' : ''}">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid var(--slate-200)">
        <h3 style="font-weight:600; font-size:1rem; color: var(--slate-900); margin:0">${escapeHtml(opts.title)}</h3>
        <button class="icon-btn" data-close title="Tutup">${icon('x', 'w-5 h-5')}</button>
      </div>
      <div style="padding:1.25rem; overflow-y:auto">${opts.body}</div>
      ${opts.footer ? `<div style="padding:1rem 1.25rem; border-top:1px solid var(--slate-200); display:flex; justify-content:flex-end; gap:0.5rem; background: var(--slate-50)">${opts.footer}</div>` : ''}
    </div>`;
  document.body.appendChild(wrap);
  refreshIcons();

  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
}

function closeModal() {
  const m = document.getElementById('sispaModal');
  if (m) m.remove();
}

/* ============================================================
   CONFIRM (browser native, cepat)
   ============================================================ */

function confirmAction(title, message, opts) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.id = 'sispaConfirm';
    wrap.className = 'modal-backdrop';
    const danger = opts && opts.danger;
    wrap.innerHTML = `
      <div class="modal-panel" style="max-width:440px">
        <div style="padding:1.5rem">
          <div style="display:flex; align-items:flex-start; gap:1rem">
            <div style="width:44px; height:44px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; background: ${danger ? '#fee2e2' : '#eef2ff'}; color: ${danger ? 'var(--danger)' : 'var(--brand-600)'}">
              ${icon(danger ? 'alert-triangle' : 'help-circle', 'w-5 h-5')}
            </div>
            <div style="flex:1">
              <h3 style="font-weight:600; font-size:1rem; color: var(--slate-900); margin: 0 0 0.5rem">${escapeHtml(title)}</h3>
              <p style="font-size:0.875rem; color: var(--slate-600); margin:0; line-height:1.5">${escapeHtml(message || '')}</p>
            </div>
          </div>
        </div>
        <div style="padding:1rem 1.25rem; border-top:1px solid var(--slate-200); display:flex; justify-content:flex-end; gap:0.5rem; background: var(--slate-50)">
          <button class="btn btn-secondary" data-cancel>${escapeHtml((opts && opts.cancelText) || 'Batal')}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml((opts && opts.confirmText) || 'Ya, lanjutkan')}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    refreshIcons();

    const close = () => wrap.remove();
    wrap.querySelector('[data-cancel]').addEventListener('click', () => { close(); resolve(false); });
    wrap.querySelector('[data-confirm]').addEventListener('click', () => { close(); resolve(true); });
    wrap.addEventListener('click', (e) => { if (e.target === wrap) { close(); resolve(false); } });
  });
}

/* ============================================================
   UTILS
   ============================================================ */

function el(id) {
  const node = document.getElementById(id);
  if (node) return node;
  console.warn('[SISPA] Elemen tidak ditemukan:', id);
  return {
    textContent: '', innerHTML: '', value: '',
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {}, dataset: {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatTanggal(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatTanggalWaktu(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/* ============================================================
   EXPORT
   ============================================================ */

window.refreshIcons = refreshIcons;
window.icon = icon;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.withLoading = withLoading;
window.openModal = openModal;
window.closeModal = closeModal;
window.confirmAction = confirmAction;
window.el = el;
window.escapeHtml = escapeHtml;
window.formatTanggal = formatTanggal;
window.formatTanggalWaktu = formatTanggalWaktu;
window.todayIso = todayIso;
