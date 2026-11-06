const DocumentModel = require('../models/documentModel');

exports.getHomePage = (req, res) => {
  const docs = DocumentModel.getAllDocuments();
  res.render('index', { 
    title: 'RuangPaham AI — Asisten Belajar Dokumen',
    documents: docs 
  });
};