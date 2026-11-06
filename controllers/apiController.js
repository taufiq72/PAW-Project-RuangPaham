const DocumentModel = require('../models/documentModel');

exports.getStatus = (req, res) => {
  res.json({
    status: 'Success',
    message: 'Server RuangPaham AI Backend (Week 7) berjalan dengan baik',
    timestamp: new Date()
  });
};

exports.getProducts = (req, res) => {
  const data = DocumentModel.getAllDocuments();
  res.json({
    status: 'Success',
    data: data
  });
};