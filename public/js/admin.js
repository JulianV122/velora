const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);

const state = {
  token: localStorage.getItem('velora_token') || '',
  user: localStorage.getItem('velora_user') || '',
  products: []
};

function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('text-red-500', isError);
  t.classList.toggle('text-mauve', !isError);
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

function showLogin() {
  $('login-view').classList.remove('hidden');
  $('dash-view').classList.add('hidden');
}
function showDash() {
  $('login-view').classList.add('hidden');
  $('dash-view').classList.remove('hidden');
  $('who').textContent = state.user;
  loadProducts();
}

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Sesión expirada');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

// ---------- LOGIN ----------
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('li-err').classList.add('hidden');
  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('li-user').value, password: $('li-pass').value })
    }).then(r => r.json().then(d => ({ ok: r.ok, d })));
    if (!r.ok) throw new Error(r.d.error || 'Error');
    state.token = r.d.token;
    state.user = r.d.username;
    localStorage.setItem('velora_token', state.token);
    localStorage.setItem('velora_user', state.user);
    showDash();
  } catch (err) {
    $('li-err').textContent = err.message;
    $('li-err').classList.remove('hidden');
  }
});

function logout() {
  state.token = '';
  state.user = '';
  localStorage.removeItem('velora_token');
  localStorage.removeItem('velora_user');
  showLogin();
}
$('logout').addEventListener('click', logout);

// ---------- PRODUCTS ----------
async function loadProducts() {
  try {
    state.products = await api('/api/products');
    render();
  } catch (e) { toast(e.message, true); }
}

function render() {
  const tbody = $('rows');
  tbody.innerHTML = '';
  state.products.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'border-t border-blush-50 hover:bg-blush-50/40';
    tr.innerHTML = `
      <td class="px-4 py-3"><img src="${p.image}" class="w-14 h-14 rounded-lg object-cover" /></td>
      <td class="px-4 py-3 font-medium text-stone-700">${escapeHtml(p.name)}</td>
      <td class="px-4 py-3 text-stone-500">${escapeHtml(p.category)}</td>
      <td class="px-4 py-3 font-medium text-mauve">${fmt.format(p.price)}</td>
      <td class="px-4 py-3 text-center">${p.available
        ? '<span class="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Sí</span>'
        : '<span class="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs">No</span>'}</td>
      <td class="px-4 py-3 text-center">${p.featured ? '⭐' : ''}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button data-edit="${p.id}" class="px-3 py-1.5 rounded-full bg-blush-100 hover:bg-blush-200 text-mauve text-xs">Editar</button>
        <button data-del="${p.id}" class="px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 text-xs">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openModal(state.products.find(p => p.id == b.dataset.edit))));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => del(b.dataset.del)));

  // stats
  $('stat-total').textContent = state.products.length;
  $('stat-avail').textContent = state.products.filter(p => p.available).length;
  $('stat-feat').textContent = state.products.filter(p => p.featured).length;
  $('stat-cats').textContent = new Set(state.products.map(p => p.category)).size;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ---------- MODAL ----------
const MAX_IMAGES = 10;
let existingImages = []; // URLs ya guardadas en el servidor
let newFiles = [];       // File objects pendientes de subir

function openModal(p = null) {
  $('modal').classList.remove('hidden');
  $('f-err').classList.add('hidden');
  $('modal-title').textContent = p ? 'Editar producto' : 'Nuevo producto';
  $('f-id').value = p?.id || '';
  $('f-name').value = p?.name || '';
  $('f-category').value = p?.category || '';
  $('f-price').value = p?.price ?? '';
  $('f-description').value = p?.description || '';
  $('f-available').checked = p ? !!p.available : true;
  $('f-featured').checked = p ? !!p.featured : false;
  $('f-image').value = '';
  existingImages = p?.images ? [...p.images] : (p?.image ? [p.image] : []);
  newFiles = [];
  renderPreviews();
}
function closeModal() { $('modal').classList.add('hidden'); }

function renderPreviews() {
  const wrap = $('f-previews');
  wrap.innerHTML = '';
  const total = existingImages.length + newFiles.length;
  if (total === 0) {
    wrap.innerHTML = '<p class="text-xs text-stone-400 italic px-2 py-3">Sin imágenes. Añade al menos una.</p>';
    return;
  }
  existingImages.forEach((url, i) => wrap.appendChild(thumb(url, i, 'existing', i === 0)));
  newFiles.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    wrap.appendChild(thumb(url, i, 'new', existingImages.length === 0 && i === 0));
  });
}
function thumb(url, idx, kind, isCover) {
  const el = document.createElement('div');
  el.className = 'relative w-20 h-20 rounded-lg overflow-hidden ring-1 ring-blush-200 group';
  el.innerHTML = `
    <img src="${url}" class="w-full h-full object-cover" />
    ${isCover ? '<span class="absolute bottom-0 inset-x-0 bg-blush-500/90 text-white text-[9px] tracking-widest uppercase text-center py-0.5">Portada</span>' : ''}
    <button type="button" data-kind="${kind}" data-idx="${idx}" title="Eliminar"
      class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs leading-none flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition">×</button>`;
  el.querySelector('button').addEventListener('click', () => {
    if (kind === 'existing') existingImages.splice(idx, 1);
    else newFiles.splice(idx, 1);
    renderPreviews();
  });
  return el;
}

$('btn-new').addEventListener('click', () => openModal(null));
$('modal-close').addEventListener('click', closeModal);
$('cancel').addEventListener('click', closeModal);
$('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeModal(); });

$('f-image').addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  const space = MAX_IMAGES - existingImages.length - newFiles.length;
  if (space <= 0) {
    toast(`Máximo ${MAX_IMAGES} imágenes por producto`, true);
  } else {
    newFiles.push(...files.slice(0, space));
    if (files.length > space) toast(`Solo se aceptaron ${space} imágenes (límite ${MAX_IMAGES})`, true);
  }
  e.target.value = ''; // permite re-elegir el mismo archivo
  renderPreviews();
});

$('prod-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('f-err').classList.add('hidden');
  try {
    if (existingImages.length + newFiles.length === 0) {
      $('f-err').textContent = 'Añade al menos una imagen.';
      $('f-err').classList.remove('hidden');
      return;
    }
    const id = $('f-id').value;
    const fd = new FormData();
    fd.append('name', $('f-name').value);
    fd.append('category', $('f-category').value);
    fd.append('price', $('f-price').value);
    fd.append('description', $('f-description').value);
    fd.append('available', $('f-available').checked);
    fd.append('featured', $('f-featured').checked);
    fd.append('existing_images', JSON.stringify(existingImages));
    newFiles.forEach(f => fd.append('images', f));

    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';
    await api(url, { method, body: fd });
    closeModal();
    toast(id ? 'Producto actualizado' : 'Producto creado');
    loadProducts();
  } catch (err) {
    $('f-err').textContent = err.message;
    $('f-err').classList.remove('hidden');
  }
});

async function del(id) {
  if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
  try {
    await api(`/api/products/${id}`, { method: 'DELETE' });
    toast('Producto eliminado');
    loadProducts();
  } catch (e) { toast(e.message, true); }
}

// ---------- BOOT ----------
if (state.token) showDash();
else showLogin();
