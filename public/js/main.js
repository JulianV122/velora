const WA_NUMBER = '573243838701';
const IG_URL = 'https://instagram.com/byvelora_____';

const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('hero-wa').href = waLink('¡Hola Velora! Quiero más información sobre sus productos 🤍');
document.getElementById('footer-wa').href = waLink('¡Hola Velora!');

// Navbar shrink on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.classList.add('bg-white/85', 'shadow-sm');
    nav.classList.remove('bg-white/40');
  } else {
    nav.classList.add('bg-white/40');
    nav.classList.remove('bg-white/85', 'shadow-sm');
  }
});

// WhatsApp bubble
const waToggle = document.getElementById('wa-toggle');
const waPanel = document.getElementById('wa-panel');
const waForm = document.getElementById('wa-form');
const waMsg = document.getElementById('wa-msg');
waToggle.addEventListener('click', () => waPanel.classList.toggle('hidden'));
waForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = waMsg.value.trim() || '¡Hola Velora!';
  window.open(waLink(text), '_blank');
  waMsg.value = '';
});

// ----- Data -----
let allProducts = [];
let activeCategory = 'Todos';

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    allProducts = await res.json();
  } catch (err) {
    console.error('No se pudieron cargar productos', err);
    allProducts = [];
  }
  renderCarousel();
  renderCategories();
  renderGrid();
}

// ----- Carousel -----
function renderCarousel() {
  const featured = allProducts.filter(p => p.featured && p.available);
  const slides = (featured.length ? featured : allProducts.slice(0, 4));
  const track = document.getElementById('carousel-track');
  const dots = document.getElementById('car-dots');
  track.innerHTML = '';
  dots.innerHTML = '';
  if (!slides.length) {
    track.innerHTML = '<div class="car-slide flex items-center justify-center text-stone-400">Sin productos destacados</div>';
    return;
  }
  slides.forEach((p, i) => {
    const slide = document.createElement('div');
    slide.className = 'car-slide';
    slide.innerHTML = `
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      <div class="caption">
        <p class="text-xs uppercase tracking-[0.25em] opacity-90">${p.category}</p>
        <h3 class="font-serif text-2xl md:text-4xl mt-1">${p.name}</h3>
        <div class="mt-3 flex items-center gap-4">
          <span class="font-medium text-lg">${fmt.format(p.price)}</span>
          <a href="${waLink('Hola, estoy interesad@ en ' + p.name + '.')}" target="_blank"
             class="px-5 py-2 rounded-full bg-white/95 text-mauve text-sm font-medium hover:bg-white">
             Lo quiero
          </a>
        </div>
      </div>`;
    track.appendChild(slide);
    const d = document.createElement('button');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => go(i));
    dots.appendChild(d);
  });

  let idx = 0;
  const total = slides.length;
  const update = () => {
    track.style.transform = `translateX(-${idx * 100}%)`;
    [...dots.children].forEach((d, i) => d.classList.toggle('active', i === idx));
  };
  const go = (i) => { idx = (i + total) % total; update(); };
  document.getElementById('car-prev').onclick = () => go(idx - 1);
  document.getElementById('car-next').onclick = () => go(idx + 1);
  clearInterval(window.__carInt);
  window.__carInt = setInterval(() => go(idx + 1), 5000);
}

// ----- Categories -----
function renderCategories() {
  const wrap = document.getElementById('cat-chips');
  const cats = ['Todos', ...Array.from(new Set(allProducts.map(p => p.category)))];
  wrap.innerHTML = '';
  cats.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'chip' + (cat === activeCategory ? ' active' : '');
    b.textContent = cat;
    b.addEventListener('click', () => {
      activeCategory = cat;
      document.querySelectorAll('#cat-chips .chip').forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      renderGrid();
      document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
    });
    wrap.appendChild(b);
  });
}

// ----- Grid -----
function renderGrid() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const list = activeCategory === 'Todos' ? allProducts : allProducts.filter(p => p.category === activeCategory);
  grid.innerHTML = '';
  empty.classList.toggle('hidden', list.length > 0);
  list.forEach(p => {
    const wa = waLink(`Hola, estoy interesad@ en ${p.name}.`);
    const card = document.createElement('article');
    card.className = 'product-card relative bg-white rounded-2xl overflow-hidden shadow-md shadow-blush-200/30 flex flex-col';
    card.innerHTML = `
      <div class="img-wrap relative aspect-[4/5]">
        <img src="${p.image}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover" />
        ${p.available ? '' : '<div class="ribbon">Agotado</div>'}
        ${p.featured ? '<span class="absolute top-3 right-3 bg-blush-400 text-white text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full shadow">Destacado</span>' : ''}
      </div>
      <div class="p-5 flex flex-col flex-1">
        <p class="text-[11px] tracking-[0.2em] uppercase text-blush-500">${p.category}</p>
        <h3 class="font-serif text-xl text-mauve mt-1">${p.name}</h3>
        ${p.description ? `<p class="text-sm text-stone-500 mt-2 line-clamp-2">${p.description}</p>` : ''}
        <div class="mt-auto pt-4 flex items-center justify-between gap-3">
          <span class="font-serif text-lg text-mauve font-semibold">${fmt.format(p.price)}</span>
          ${p.available
            ? `<a href="${wa}" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#25D366] hover:bg-green-500 text-white text-sm font-medium transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 003.6 17.3L2 22l4.8-1.6a11 11 0 0013.7-16.9z"/></svg>
                Lo quiero
              </a>`
            : `<span class="text-xs text-stone-400 italic">No disponible</span>`}
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

loadProducts();
