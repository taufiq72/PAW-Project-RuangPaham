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
db.exec(`PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS document_pdfs (
  document_id INTEGER PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  content BLOB NOT NULL,
  revision TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Diproses' CHECK(state IN ('Diproses','Siap','Gagal')),
  error TEXT
);
CREATE TABLE IF NOT EXISTS pdf_pages (
  document_id INTEGER NOT NULL REFERENCES document_pdfs(document_id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY(document_id,page)
);
CREATE TABLE IF NOT EXISTS pdf_answers (
  id TEXT PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document_pdfs(document_id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  helpful INTEGER CHECK(helpful IN (0,1))
);
CREATE TABLE IF NOT EXISTS pdf_vectors (
  document_id INTEGER NOT NULL REFERENCES document_pdfs(document_id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  vectors TEXT NOT NULL,
  PRIMARY KEY(document_id,model)
);
CREATE INDEX IF NOT EXISTS pdf_answers_document ON pdf_answers(document_id);`);
// Upgrade databases created by the initial attachment-only implementation.
const pdfColumns = db.prepare('PRAGMA table_info(document_pdfs)').all();
if (!pdfColumns.some(column => column.name === 'revision')) {
  db.exec(`BEGIN;
  ALTER TABLE document_pdfs ADD COLUMN revision TEXT;
  ALTER TABLE document_pdfs ADD COLUMN state TEXT NOT NULL DEFAULT 'Diproses' CHECK(state IN ('Diproses','Siap','Gagal'));
  ALTER TABLE document_pdfs ADD COLUMN error TEXT;
  UPDATE document_pdfs SET revision=lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6)));
  COMMIT;`);
}
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
