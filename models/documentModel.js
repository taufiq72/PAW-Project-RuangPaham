const db = require('../config/database');
const getDocumentById = id => db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
module.exports = {
  getAllDocuments: () => db.prepare('SELECT * FROM documents ORDER BY id DESC').all(),
  getDocumentById,
  createDocument: ({ title, status, pages }) => {
    const result = db.prepare('INSERT INTO documents (title, status, pages) VALUES (?, ?, ?)').run(title, status, pages);
    return getDocumentById(Number(result.lastInsertRowid));
  },
  updateDocument: (id, { title, status, pages }) => {
    const result = db.prepare("UPDATE documents SET title=?, status=?, pages=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").run(title, status, pages, id);
    return result.changes ? getDocumentById(id) : null;
  },
  deleteDocument: id => db.prepare('DELETE FROM documents WHERE id=?').run(id).changes > 0,
  checkConnection: () => db.prepare('SELECT 1 AS connected').get().connected === 1
};
