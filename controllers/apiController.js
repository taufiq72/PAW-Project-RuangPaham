const Document = require('../models/documentModel');
const { parseId, validateDocument } = require('../utils/documentValidation');
exports.getStatus = (req, res) => res.json({ status: 'Success', message: 'Server RuangPaham AI Backend (Week 10) berjalan dengan baik', database: Document.checkConnection() ? 'connected' : 'disconnected', timestamp: new Date() });
exports.validateId = (req, res, next) => {
  req.documentId = parseId(req.params.id);
  if (!req.documentId) return res.status(400).json({ status: 'Error', message: 'ID harus bilangan bulat positif.' });
  next();
};
exports.validateBody = (req, res, next) => {
  const { errors, data } = validateDocument(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ status: 'Error', message: 'Data dokumen tidak valid.', errors });
  req.documentData = data;
  next();
};
const notFound = res => res.status(404).json({ status: 'Error', message: 'Dokumen tidak ditemukan.' });
exports.getProducts = (req, res) => res.json({ status: 'Success', data: Document.getAllDocuments() });
exports.getDocument = (req, res) => {
  const data = Document.getDocumentById(req.documentId);
  return data ? res.json({ status: 'Success', data }) : notFound(res);
};
exports.createDocument = (req, res) => {
  const data = Document.createDocument(req.documentData);
  res.location(`${req.baseUrl}${req.path.replace(/\/$/, '')}/${data.id}`).status(201).json({ status: 'Success', message: 'Dokumen berhasil ditambahkan.', data });
};
exports.updateDocument = (req, res) => {
  const data = Document.updateDocument(req.documentId, req.documentData);
  return data ? res.json({ status: 'Success', message: 'Dokumen berhasil diperbarui.', data }) : notFound(res);
};
exports.deleteDocument = (req, res) => Document.deleteDocument(req.documentId)
  ? res.json({ status: 'Success', message: 'Dokumen berhasil dihapus.' }) : notFound(res);
