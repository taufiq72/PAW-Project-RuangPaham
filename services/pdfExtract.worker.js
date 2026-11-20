const { parentPort, workerData } = require('node:worker_threads');
const path = require('node:path');

async function extract() {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const root = path.resolve(path.dirname(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')), '../..');
  const asset = name => path.join(root, name).replace(/\\/g, '/') + '/';
  const task = getDocument({ data: workerData, isEvalSupported: false, stopAtErrors: true, useSystemFonts: false,
    standardFontDataUrl: asset('standard_fonts'), cMapUrl: asset('cmaps'), cMapPacked: true, useWasm: false });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 500) return { error: 'PDF maksimal 500 halaman.' };
    const pages = [];
    let chars = 0;
    for (let num = 1; num <= pdf.numPages; num++) {
      const page = await pdf.getPage(num);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
      chars += text.length;
      if (chars > 250000) return { error: 'Teks PDF terlalu panjang (maksimal 250.000 karakter). Bagi PDF menjadi beberapa materi.' };
      pages.push({ page: num, text });
      page.cleanup();
    }
    return pages.some(({ text }) => /[\p{L}\p{N}]/u.test(text)) ? { pages } : { error: 'Tidak ada teks yang dapat dibaca. Gunakan PDF berbasis teks, bukan hasil pindai.' };
  } finally { await task.destroy(); }
}

extract().then(result => parentPort.postMessage(result), error => parentPort.postMessage({ error: error.name === 'PasswordException'
  ? 'PDF terkunci. Unggah salinan tanpa kata sandi.' : 'PDF tidak dapat diproses. Pastikan file bisa dibuka dan berisi teks.' }));