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

function imagesOf(p) {
  return Array.isArray(p.images) && p.images.length ? p.images : [p.image];
}

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
    const cover = imagesOf(p)[0];
    const slide = document.createElement('div');
    slide.className = 'car-slide';
    slide.innerHTML = `
      <img src="${cover}" alt="${p.name}" loading="lazy" />
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
    const imgs = imagesOf(p);
    const cover = imgs[0];
    const extra = imgs.length - 1;
    const card = document.createElement('article');
    card.className = 'product-card relative bg-white rounded-2xl overflow-hidden shadow-md shadow-blush-200/30 flex flex-col';
    card.innerHTML = `
      <button type="button" data-pid="${p.id}" class="img-wrap relative aspect-[4/5] block text-left w-full">
        <img src="${cover}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover" />
        ${p.available ? '' : '<div class="ribbon">Agotado</div>'}
        ${p.featured ? '<span class="absolute top-3 right-3 bg-blush-400 text-white text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full shadow">Destacado</span>' : ''}
        ${extra > 0 ? `<span class="absolute bottom-3 right-3 bg-black/55 backdrop-blur text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          +${extra}
        </span>` : ''}
      </button>
      <div class="p-5 flex flex-col flex-1">
        <p class="text-[11px] tracking-[0.2em] uppercase text-blush-500">${p.category}</p>
        <h3 class="font-serif text-xl text-mauve mt-1">${p.name}</h3>
        ${p.description ? `<p class="text-sm text-stone-500 mt-2 line-clamp-2">${p.description}</p>` : ''}
        <div class="mt-auto pt-4 flex items-center justify-between gap-3">
          <span class="font-serif text-lg text-mauve font-semibold">${fmt.format(p.price)}</span>
          ${p.available
            ? `<a href="${wa}" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#25D366] hover:bg-green-500 text-white text-sm font-medium transition">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
                </svg>
                Lo quiero
              </a>`
            : `<span class="text-xs text-stone-400 italic">No disponible</span>`}
        </div>
      </div>`;
    grid.appendChild(card);
  });

  // Click en imagen → lightbox
  grid.querySelectorAll('[data-pid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = allProducts.find(x => x.id == btn.dataset.pid);
      if (p) openLightbox(p);
    });
  });
}

// ----- Lightbox -----
const lb = {
  el: document.getElementById('lightbox'),
  img: document.getElementById('lb-img'),
  title: document.getElementById('lb-title'),
  counter: document.getElementById('lb-counter'),
  thumbs: document.getElementById('lb-thumbs'),
  wa: document.getElementById('lb-wa'),
  product: null,
  index: 0
};

function openLightbox(p) {
  lb.product = p;
  lb.index = 0;
  lb.el.classList.remove('hidden');
  lb.el.classList.add('flex');
  document.body.style.overflow = 'hidden';
  renderLightbox();
}
function closeLightbox() {
  lb.el.classList.add('hidden');
  lb.el.classList.remove('flex');
  document.body.style.overflow = '';
}
function renderLightbox() {
  if (!lb.product) return;
  const imgs = imagesOf(lb.product);
  lb.index = ((lb.index % imgs.length) + imgs.length) % imgs.length;
  lb.img.src = imgs[lb.index];
  lb.img.alt = lb.product.name;
  lb.title.textContent = lb.product.name;
  lb.counter.textContent = `${lb.index + 1} / ${imgs.length} · ${lb.product.category}`;
  lb.wa.href = waLink(`Hola, estoy interesad@ en ${lb.product.name}.`);
  lb.thumbs.innerHTML = '';
  if (imgs.length > 1) {
    imgs.forEach((src, i) => {
      const t = document.createElement('button');
      t.className = `w-14 h-14 rounded-md overflow-hidden ring-2 transition ${i === lb.index ? 'ring-white' : 'ring-transparent opacity-60 hover:opacity-100'}`;
      t.innerHTML = `<img src="${src}" class="w-full h-full object-cover" />`;
      t.addEventListener('click', () => { lb.index = i; renderLightbox(); });
      lb.thumbs.appendChild(t);
    });
  }
}
document.getElementById('lb-close').addEventListener('click', closeLightbox);
document.getElementById('lb-prev').addEventListener('click', () => { lb.index--; renderLightbox(); });
document.getElementById('lb-next').addEventListener('click', () => { lb.index++; renderLightbox(); });
lb.el.addEventListener('click', (e) => { if (e.target === lb.el) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (lb.el.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') { lb.index--; renderLightbox(); }
  if (e.key === 'ArrowRight') { lb.index++; renderLightbox(); }
});

loadProducts();
