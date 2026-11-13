exports.parseId = value => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
exports.validateDocument = body => {
  const errors = {};
  const { title, status, pages } = body || {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) errors.title = 'Judul wajib diisi, maksimal 200 karakter.';
  if (!['Siap', 'Diproses'].includes(status)) errors.status = 'Status harus Siap atau Diproses.';
  if (!Number.isInteger(pages) || pages < 1 || pages > 10000) errors.pages = 'Jumlah halaman harus bilangan bulat 1–10000.';
  return { errors, data: { title: typeof title === 'string' ? title.trim() : '', status, pages } };
};
