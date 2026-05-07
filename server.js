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

// ---------- Products (public) ----------
app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY featured DESC, id DESC').all();
  res.json(rows.map(r => ({ ...r, available: !!r.available, featured: !!r.featured })));
});

// ---------- Products (admin) ----------
app.post('/api/products', authRequired, upload.single('image'), (req, res) => {
  const { name, category, price, description, available, featured } = req.body;
  if (!name || !category || !price) return res.status(400).json({ error: 'name, category y price son requeridos' });
  const image = req.file ? `/uploads/${req.file.filename}` : (req.body.image || '');
  if (!image) return res.status(400).json({ error: 'Imagen requerida' });
  const info = db.prepare(`
    INSERT INTO products (name, category, price, description, image, available, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, category, parseFloat(price), description || '', image, available === 'false' || available === false ? 0 : 1, featured === 'true' || featured === true ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/products/:id', authRequired, upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  const { name, category, price, description, available, featured } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : existing.image;
  db.prepare(`
    UPDATE products SET name=?, category=?, price=?, description=?, image=?, available=?, featured=?
    WHERE id=?
  `).run(
    name ?? existing.name,
    category ?? existing.category,
    price !== undefined ? parseFloat(price) : existing.price,
    description ?? existing.description,
    image,
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
  // Best-effort delete file (only if it lives in /uploads and is a custom upload)
  if (prod.image && prod.image.startsWith('/uploads/prod_')) {
    const filePath = path.join(__dirname, 'public', prod.image);
    fs.promises.unlink(filePath).catch(() => {});
  }
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
