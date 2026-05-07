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
  $('f-preview').src = p?.image || '/LogoVelora.jpeg';
}
function closeModal() { $('modal').classList.add('hidden'); }

$('btn-new').addEventListener('click', () => openModal(null));
$('modal-close').addEventListener('click', closeModal);
$('cancel').addEventListener('click', closeModal);
$('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeModal(); });

$('f-image').addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (f) $('f-preview').src = URL.createObjectURL(f);
});

$('prod-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('f-err').classList.add('hidden');
  try {
    const id = $('f-id').value;
    const fd = new FormData();
    fd.append('name', $('f-name').value);
    fd.append('category', $('f-category').value);
    fd.append('price', $('f-price').value);
    fd.append('description', $('f-description').value);
    fd.append('available', $('f-available').checked);
    fd.append('featured', $('f-featured').checked);
    const file = $('f-image').files?.[0];
    if (file) fd.append('image', file);
    else if (!id) {
      $('f-err').textContent = 'Selecciona una imagen para el producto.';
      $('f-err').classList.remove('hidden');
      return;
    }

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
