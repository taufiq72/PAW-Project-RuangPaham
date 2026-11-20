const service = require('../services/gemini.service');
const pdfService = require('../services/pdfChat.service');
const Document = require('../models/documentModel');
exports.handleChat = async (req, res) => {
  try {
    const data = await (req.chatMode === 'pdf' ? pdfService.askPdf(req.chatInput) : service.askGemini(req.chatInput));
    res.json({ success: true, data });
  }
  catch (error) {
    // Never log provider payloads, prompts or API keys.
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Terjadi kesalahan pada server AI.' });
  }
};
exports.rate = (req, res) => {
  if (!/^[a-f0-9-]{36}$/.test(req.params.id) || typeof req.body?.helpful !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Penilaian tidak valid.' });
  }
  const helpful = Document.rateAnswer(req.params.id, req.body.helpful);
  if (helpful === null) return res.status(404).json({ success: false, message: 'Jawaban tidak ditemukan.' });
  res.json({ success: true, data: { helpful } });
};
