const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const dbPath = path.join(DATA_DIR, 'velora.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT DEFAULT '',
    image TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default admin
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('velora2026', 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('[seed] admin user created (admin / velora2026)');
}

// Seed initial products
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (productCount === 0) {
  const categories = [
    'Moños', 'Scrunchies', 'Pijamas de satín', 'Gorros de satín',
    'Tubos para ondas', 'Balacas', 'Ropa interior', 'Batas de pijama',
    'Moños', 'Scrunchies'
  ];
  const insert = db.prepare(`
    INSERT INTO products (name, category, price, description, image, available, featured)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);
  for (let i = 1; i <= 10; i++) {
    insert.run(
      `Producto ${i}`,
      categories[i - 1],
      35000,
      'Descripción editable desde el panel de administración.',
      `/uploads/img${i}.jpeg`,
      i <= 4 ? 1 : 0
    );
  }
  console.log('[seed] 10 productos iniciales creados');
}

module.exports = db;
