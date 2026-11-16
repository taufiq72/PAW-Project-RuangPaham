module.exports = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong dan harus berupa teks.' });
  }
  if (body.message.length > 1000) return res.status(400).json({ success: false, message: 'Pesan maksimal 1000 karakter.' });
  if (body.documentId !== undefined && (!Number.isSafeInteger(body.documentId) || body.documentId < 1)) {
    return res.status(400).json({ success: false, message: 'documentId harus bilangan bulat positif.' });
  }
  // Only validated fields reach the service; ignore client context/system/history.
  req.chatInput = { message: body.message.trim().normalize('NFKC'), documentId: body.documentId };
  next();
};
