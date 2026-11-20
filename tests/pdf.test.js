const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_PATH = ':memory:';
const app = require('../app');
const db = require('../config/database');
const pdfService = require('../services/pdfChat.service');
const model = require('../models/documentModel');
const { indexPages, chunksFor } = require('../services/pdfEmbedding.service');
let server, base;
before(async () => {
  delete process.env.STUDENT_USERNAME;
  delete process.env.STUDENT_PASSWORD;
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });

function makePdf(texts) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Count ${texts.length} /Kids [${texts.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  texts.forEach((text, i) => {
    const stream = text ? `BT /F1 12 Tf 30 100 Td (${text}) Tj ET` : '';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let output = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => { const at = output.length; output += `${i + 1} 0 obj\n${object}\nendobj\n`; return at; });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(at => `${String(at).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}
const api = (path, options) => fetch(base + '/api' + path, options);
const json = (body, method = 'POST') => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function upload(content, id) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: 'Materi Uji PDF', pages: '1', status: 'Diproses' })) form.append(key, value);
  form.append('pdf', new Blob([content], { type: 'application/pdf' }), 'materi.pdf');
  return api('/dokumen' + (id ? `/${id}` : ''), { method: id ? 'PUT' : 'POST', body: form });
}
async function waitForPdf(id) {
  for (let i = 0; i < 100; i++) {
    const { data } = await (await api(`/dokumen/${id}`)).json();
    if (data.pdf_status !== 'Diproses') return data;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.fail('PDF processing timeout');
}
const fixture = points => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ points }) }] } }] }) });

test('PDF upload extracts real pages, restricts context, opens citations, rates once, and invalidates old indexes', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const passage = 'Klorofil menyerap cahaya untuk fotosintesis.';
  const bytes = makePdf(['Bab pengantar biologi.', passage]);
  const posted = await upload(bytes);
  assert.equal(posted.status, 201);
  const { data } = await posted.json();
  assert.equal(data.pdf_status, 'Diproses');
  const doc = await waitForPdf(data.id);
  assert.equal(doc.pdf_status, 'Siap', doc.pdf_error);
  assert.equal(doc.pages, 2);
  assert.deepEqual(model.getPages(doc.id).map(p => p.text), ['Bab pengantar biologi.', passage]);
  assert.equal(doc.content, undefined);
  assert.equal((await api('/chat', json({ mode: 'pdf', message: 'Apa itu klorofil?' }))).status, 400);
  assert.equal((await api('/chat', json({ mode: 'pdf', message: 'Apa itu klorofil?', documentId: 1 }))).status, 400);

  const ask = (points, action) => pdfService.askPdf({ message: 'Apa fungsi klorofil?', documentId: doc.id, action }, { fetchImpl: async (_, request) => {
    const { contents } = JSON.parse(request.body);
    const { context } = JSON.parse(contents[0].parts[0].text);
    assert.deepEqual(context.map(p => p.page), [1, 2]);
    assert.match(context[1].text, /Klorofil/);
    return fixture(points);
  } });
  const valid = { text: 'Klorofil menyerap cahaya.', quote: passage, page: 2 };
  const original = pdfService.askPdf;
  let answer;
  try {
    pdfService.askPdf = input => { assert.equal(input.documentId, doc.id); return original(input, { fetchImpl: async () => fixture([valid]) }); };
    const response = await api('/chat', json({ mode: 'pdf', message: 'Apa fungsi klorofil?', documentId: doc.id }));
    assert.equal(response.status, 200);
    answer = (await response.json()).data;
  } finally { pdfService.askPdf = original; }
  assert.equal(answer.sources[0].page, 2);
  const citation = new URL(answer.sources[0].url, base);
  assert.equal(citation.hash, '#page=2');
  const opened = await fetch(citation);
  assert.equal(opened.status, 200);
  assert.match(opened.headers.get('content-disposition'), /^inline/);
  assert.deepEqual(Buffer.from(await opened.arrayBuffer()), bytes);

  for (const points of [[], [{ ...valid, page: 1 }], [{ ...valid, quote: 'Kutipan ini tidak ada.' }]]) {
    assert.deepEqual(await ask(points), { reply: 'Informasi tidak ditemukan dalam materi yang dipilih', sources: [] });
  }
  const summary = await ask([{ ...valid, text: 'kata '.repeat(301) }, valid], 'summary');
  assert.equal(summary.sources.length, 1);
  assert.ok(summary.reply.split(/\s+/).length <= 300);
  const rate = helpful => api(`/chat/answers/${answer.answerId}/feedback`, json({ helpful }));
  assert.equal((await (await rate(true)).json()).data.helpful, true);
  assert.equal((await (await rate(false)).json()).data.helpful, true);

  assert.equal((await upload(makePdf(['Isi baru.']), doc.id)).status, 200);
  assert.equal((await waitForPdf(doc.id)).pages, 1);
  assert.equal((await fetch(citation)).status, 404);
  assert.equal((await rate(true)).status, 404);
  assert.equal((await api(`/dokumen/${doc.id}`, { method: 'DELETE' })).status, 200);
  assert.equal(model.getPdf(doc.id), undefined);
  assert.deepEqual(model.getPages(doc.id), []);
});

test('invalid, oversized and textless PDFs are rejected or marked failed', async () => {
  assert.equal((await upload(Buffer.from('not a pdf'))).status, 400);
  assert.equal((await upload(Buffer.alloc(10 * 1024 * 1024 + 1))).status, 413);
  const response = await upload(makePdf(['']));
  assert.equal(response.status, 201);
  const { data } = await response.json();
  const doc = await waitForPdf(data.id);
  assert.equal(doc.pdf_status, 'Gagal');
  assert.match(doc.pdf_error, /Tidak ada teks/);
  assert.equal((await api('/chat', json({ mode: 'pdf', message: 'Apa isinya?', documentId: doc.id }))).status, 409);
});

test('configured account protects read, upload, chat and deletion', async () => {
  process.env.STUDENT_USERNAME = 'mahasiswa';
  process.env.STUDENT_PASSWORD = 'test-password';
  try {
    for (const [path, method] of [['/dokumen/1/pdf', 'GET'], ['/dokumen', 'POST'], ['/chat', 'POST'], ['/dokumen/1', 'DELETE']]) {
      const response = await api(path, { method });
      assert.equal(response.status, 401);
      assert.match(response.headers.get('www-authenticate'), /^Basic /);
    }
    const headers = { Authorization: 'Basic ' + Buffer.from('mahasiswa:test-password').toString('base64') };
    assert.equal((await api('/dokumen', { headers })).status, 200);
    assert.equal((await api('/dokumen/1', { method: 'DELETE', headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  } finally { delete process.env.STUDENT_USERNAME; delete process.env.STUDENT_PASSWORD; }
});

test('optional embeddings find relevant pages beyond the lexical shortlist', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
  const quote = 'Sintesis dilakukan dengan bantuan cahaya matahari.';
  const pages = Array.from({ length: 20 }, (_, i) => ({ page: i + 1, text: i === 19 ? quote : 'pengantar umum '.repeat(100) }));
  const doc = model.createDocument({ title: 'Uji indeks semantik', pages: 1, status: 'Diproses' }, Buffer.from('fixture'));
  const vector = index => Array.from({ length: 256 }, (_, i) => i === index ? 1 : 0);
  let offset = 0;
  try {
    const index = await indexPages(pages, { fetchImpl: async (url, options) => {
      assert.match(url, /:batchEmbedContents$/);
      const { requests } = JSON.parse(options.body);
      assert.ok(requests.every(r => r.taskType === 'RETRIEVAL_DOCUMENT'));
      return { ok: true, json: async () => ({ embeddings: requests.map(() => ({ values: vector(++offset === chunksFor(pages).length ? 1 : 0) })) }) };
    } });
    model.finishPdf(doc.id, doc.pdf_revision, { pages, index });
    const result = await pdfService.askPdf({ documentId: doc.id, message: 'Bagaimana fotosintesis?' }, { fetchImpl: async (url, options) => {
      if (url.endsWith(':embedContent')) return { ok: true, json: async () => ({ embedding: { values: vector(1) } }) };
      const { contents } = JSON.parse(options.body);
      const { context } = JSON.parse(contents[0].parts[0].text);
      assert.ok(context.some(p => p.page === 20));
      return fixture([{ text: 'Proses dibantu cahaya matahari.', page: 20, quote }]);
    } });
    assert.equal(result.sources[0].page, 20);
    model.deleteDocument(doc.id);
    assert.equal(model.getVectors(doc.id, index.name), undefined);
  } finally { delete process.env.GEMINI_EMBEDDING_MODEL; }
});