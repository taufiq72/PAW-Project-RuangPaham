const service = require('../services/gemini.service');
exports.handleChat = async (req, res) => {
  try { res.json({ success: true, data: await service.askGemini(req.chatInput) }); }
  catch (error) {
    // Never log provider payloads, prompts or API keys.
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Terjadi kesalahan pada server AI.' });
  }
};
