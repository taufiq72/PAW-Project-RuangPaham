module.exports = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong dan harus berupa teks.' });
  }
  if (body.message.length > 1000) return res.status(400).json({ success: false, message: 'Pesan maksimal 1000 karakter.' });
  if (body.documentId !== undefined && (!Number.isSafeInteger(body.documentId) || body.documentId < 1)) {
    return res.status(400).json({ success: false, message: 'documentId harus bilangan bulat positif.' });
  }
  if (body.mode !== undefined && !['catalog', 'pdf'].includes(body.mode)) {
    return res.status(400).json({ success: false, message: 'Mode pertanyaan tidak valid.' });
  }
  if (body.mode === 'pdf' && body.documentId === undefined) {
    return res.status(400).json({ success: false, message: 'Pilih satu dokumen dengan lampiran PDF.' });
  }
  if (body.action !== undefined && (body.mode !== 'pdf' || body.action !== 'summary')) {
    return res.status(400).json({ success: false, message: 'Aksi pertanyaan tidak valid.' });
  }
  // Only validated fields reach the service; ignore client context/system/history.
  req.chatInput = { message: body.message.trim().normalize('NFKC'), documentId: body.documentId };
  req.chatMode = body.mode;
  if (body.action) req.chatInput.action = body.action;
  next();
};
