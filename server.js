const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'velora-dev-secret-change-me';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer storage
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `prod_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|jpg)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Solo imágenes (jpeg, png, webp)'), ok);
  }
});

function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, username: user.username });
});

// Helpers ----------
const MAX_IMAGES = 10;

function parseImages(row) {
  let imgs = [];
  try { imgs = JSON.parse(row.images || '[]'); } catch { imgs = []; }
  if (!Array.isArray(imgs) || imgs.length === 0) imgs = row.image ? [row.image] : [];
  return imgs;
}

function unlinkUpload(relPath) {
  if (!relPath || !relPath.startsWith('/uploads/prod_')) return;
  const abs = path.join(uploadsDir, path.basename(relPath));
  fs.promises.unlink(abs).catch(() => {});
}

function parseExistingImages(req) {
  if (!req.body.existing_images) return [];
  try {
    const arr = JSON.parse(req.body.existing_images);
    return Array.isArray(arr) ? arr.filter(s => typeof s === 'string') : [];
  } catch { return []; }
}

// ---------- Products (public) ----------
app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY featured DESC, id DESC').all();
  res.json(rows.map(r => ({
    ...r,
    available: !!r.available,
    featured: !!r.featured,
    images: parseImages(r)
  })));
});

// ---------- Products (admin) ----------
app.post('/api/products', authRequired, upload.array('images', MAX_IMAGES), (req, res) => {
  const { name, category, price, description, available, featured } = req.body;
  if (!name || !category || !price) return res.status(400).json({ error: 'name, category y price son requeridos' });

  const newPaths = (req.files || []).map(f => `/uploads/${f.filename}`);
  const existing = parseExistingImages(req);
  const images = [...existing, ...newPaths].slice(0, MAX_IMAGES);
  if (images.length === 0) return res.status(400).json({ error: 'Al menos una imagen es requerida' });

  const info = db.prepare(`
    INSERT INTO products (name, category, price, description, image, images, available, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, category, parseFloat(price), description || '',
    images[0], JSON.stringify(images),
    available === 'false' || available === false ? 0 : 1,
    featured === 'true' || featured === true ? 1 : 0
  );
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/products/:id', authRequired, upload.array('images', MAX_IMAGES), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'No encontrado' });

  const { name, category, price, description, available, featured } = req.body;
  const newPaths = (req.files || []).map(f => `/uploads/${f.filename}`);
  const keep = parseExistingImages(req); // imágenes que el admin decidió conservar
  const images = [...keep, ...newPaths].slice(0, MAX_IMAGES);
  if (images.length === 0) return res.status(400).json({ error: 'Al menos una imagen es requerida' });

  // Eliminar del disco las imágenes que estaban antes pero el admin quitó
  const previous = parseImages(current);
  previous.filter(p => !keep.includes(p)).forEach(unlinkUpload);

  db.prepare(`
    UPDATE products SET name=?, category=?, price=?, description=?, image=?, images=?, available=?, featured=?
    WHERE id=?
  `).run(
    name ?? current.name,
    category ?? current.category,
    price !== undefined ? parseFloat(price) : current.price,
    description ?? current.description,
    images[0],
    JSON.stringify(images),
    available === 'false' || available === false ? 0 : 1,
    featured === 'true' || featured === true ? 1 : 0,
    id
  );
  res.json({ ok: true });
});

app.delete('/api/products/:id', authRequired, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!prod) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  parseImages(prod).forEach(unlinkUpload);
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`\n  Velora server running → http://localhost:${PORT}`);
  console.log(`  Admin → http://localhost:${PORT}/admin.html  (admin / velora2026)\n`);
});
