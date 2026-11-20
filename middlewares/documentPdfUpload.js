const { raw } = require('express');

const maxPdfBytes = 10 * 1024 * 1024;
const readMultipart = raw({ type: 'multipart/form-data', limit: maxPdfBytes + 64 * 1024, inflate: false });
const header = /^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/;
const reject = (res, status, message) => res.status(status).json({ status: 'Error', message });

exports.readMultipart = readMultipart;
exports.parseMultipart = async (req, res, next) => {
  if (!req.is('multipart/form-data')) return next();
  let form;
  try {
    form = await new Response(req.body, { headers: { 'Content-Type': req.headers['content-type'] } }).formData();
  } catch { return reject(res, 400, 'Format unggahan tidak valid.'); }

  const files = form.getAll('pdf');
  if (files.length !== 1 || !(files[0] instanceof File) || files[0].type !== 'application/pdf' || !files[0].size) {
    return reject(res, 400, 'Pilih satu file PDF yang tidak kosong.');
  }
  if (files[0].size > maxPdfBytes) return reject(res, 413, 'Ukuran PDF maksimal 10 MB.');
  const content = Buffer.from(await files[0].arrayBuffer());
  if (!header.test(content.toString('latin1', 0, 16)) || !/%%EOF[\x00\t\n\f\r ]*$/.test(content.subarray(-1024).toString('latin1'))) {
    return reject(res, 400, 'File tidak memiliki format dasar PDF yang valid.');
  }
  req.body = { title: form.get('title'), status: 'Diproses', pages: 1 };
  req.documentPdf = content;
  next();
};