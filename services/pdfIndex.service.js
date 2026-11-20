const path = require('node:path');
const { Worker } = require('node:worker_threads');
const Document = require('../models/documentModel');
const { indexPages } = require('./pdfEmbedding.service');

let running = false;
function extract(content) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'pdfExtract.worker.js'), { workerData: content, resourceLimits: { maxOldGenerationSizeMb: 128 } });
    const timer = setTimeout(() => {
      resolve({ error: 'Pemrosesan PDF melebihi batas waktu. Coba file yang lebih pendek.' });
      void worker.terminate();
    }, 30000);
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', () => { clearTimeout(timer); reject(new Error('Worker exited')); });
  });
}

exports.processPending = async () => {
  if (running) return;
  running = true;
  try {
    let pending;
    while ((pending = Document.getPending()[0])) {
      const content = Document.getPdf(pending.id);
      let result;
      try { result = await extract(content); }
      catch { result = { error: 'PDF tidak dapat diproses. Coba unggah kembali.' }; }
      if (result.pages && Document.getDocumentById(pending.id)?.pdf_revision === pending.revision) {
        try { result.index = await indexPages(result.pages); }
        catch { /* The page index is still usable for keyword retrieval. */ }
      }
      Document.finishPdf(pending.id, pending.revision, result);
    }
  } catch { console.error('Antrean pemrosesan PDF gagal.'); }
  finally { running = false; }
};