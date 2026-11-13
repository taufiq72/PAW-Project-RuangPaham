const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'ruangpaham.sqlite');
if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
// Seed only when the table is first created, never when users delete all records.
const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'").get();
db.exec(`CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
  status TEXT NOT NULL CHECK(status IN ('Siap', 'Diproses')),
  pages INTEGER NOT NULL CHECK(pages BETWEEN 1 AND 10000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`);
if (!exists) {
  const insert = db.prepare('INSERT INTO documents (title, status, pages) VALUES (?, ?, ?)');
  db.exec('BEGIN');
  try {
    insert.run('Modul 1 - Pengenalan Web Dev.pdf', 'Siap', 12);
    insert.run('Slide Pertemuan 2 - Express.js MVC.pdf', 'Siap', 25);
    insert.run('Buku Ajar Pemrograman Web Lanjut.pdf', 'Diproses', 110);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = db;
