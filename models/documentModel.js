const db = require('../config/database');
const { randomUUID } = require('node:crypto');
const select = 'SELECT d.*, p.revision AS pdf_revision,p.state AS pdf_status,p.error AS pdf_error FROM documents d LEFT JOIN document_pdfs p ON p.document_id=d.id';
const metadata = row => row && { ...row, status: row.pdf_status || row.status, has_pdf: Boolean(row.pdf_revision) };
const getDocumentById = id => metadata(db.prepare(`${select} WHERE d.id = ?`).get(id));
function transaction(operation) {
  db.exec('BEGIN');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function write(pdf, operation) {
  if (!pdf) return operation();
  return transaction(() => {
    const document = operation();
    if (!document) return null;
    db.prepare('DELETE FROM document_pdfs WHERE document_id=?').run(document.id);
    db.prepare('INSERT INTO document_pdfs(document_id,content,revision) VALUES(?,?,?)').run(document.id, pdf, randomUUID());
    return getDocumentById(document.id);
  });
}
module.exports = {
  getAllDocuments: () => db.prepare(`${select} ORDER BY d.id DESC`).all().map(metadata),
  getDocumentById,
  getPdf: id => db.prepare('SELECT content FROM document_pdfs WHERE document_id=?').get(id)?.content,
  getPending: () => db.prepare("SELECT document_id AS id, revision FROM document_pdfs WHERE state='Diproses'").all(),
  getPages: id => db.prepare('SELECT page,text FROM pdf_pages WHERE document_id=? ORDER BY page').all(id),
  getVectors: (id, name) => db.prepare('SELECT vectors FROM pdf_vectors WHERE document_id=? AND model=?').get(id, name)?.vectors,
  finishPdf: (id, revision, result) => transaction(() => {
    const changed = db.prepare("UPDATE document_pdfs SET state=?,error=? WHERE document_id=? AND revision=? AND state='Diproses'").run(result.error ? 'Gagal' : 'Siap', result.error || null, id, revision).changes;
    if (!changed || result.error) return;
    db.prepare('UPDATE documents SET pages=? WHERE id=?').run(result.pages.length, id);
    const insert = db.prepare('INSERT INTO pdf_pages(document_id,page,text) VALUES(?,?,?)');
    for (const { page, text } of result.pages) insert.run(id, page, text);
    if (result.index) db.prepare('INSERT INTO pdf_vectors(document_id,model,vectors) VALUES(?,?,?)').run(id, result.index.name, JSON.stringify(result.index.vectors));
  }),
  recordAnswer: (id, revision) => {
    const answerId = randomUUID();
    return db.prepare("INSERT INTO pdf_answers(id,document_id,revision) SELECT ?,document_id,revision FROM document_pdfs WHERE document_id=? AND revision=? AND state='Siap'").run(answerId,id,revision).changes ? answerId : null;
  },
  rateAnswer: (id, helpful) => {
    db.prepare('UPDATE pdf_answers SET helpful=? WHERE id=? AND helpful IS NULL').run(Number(helpful), id);
    const row = db.prepare('SELECT helpful FROM pdf_answers WHERE id=?').get(id);
    return row ? Boolean(row.helpful) : null;
  },
  createDocument: ({ title, status, pages }, pdf) => write(pdf, () => {
    const result = db.prepare('INSERT INTO documents (title, status, pages) VALUES (?, ?, ?)').run(title, status, pages);
    return getDocumentById(Number(result.lastInsertRowid));
  }),
  updateDocument: (id, { title, status, pages }, pdf) => write(pdf, () => {
    const result = db.prepare("UPDATE documents SET title=?, status=?, pages=CASE WHEN EXISTS(SELECT 1 FROM document_pdfs WHERE document_id=?) THEN pages ELSE ? END, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").run(title, status, id, pages, id);
    return result.changes ? getDocumentById(id) : null;
  }),
  deleteDocument: id => db.prepare('DELETE FROM documents WHERE id=?').run(id).changes > 0,
  checkConnection: () => db.prepare('SELECT 1 AS connected').get().connected === 1
};
