const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ruangpaham-test-'));
process.env.DATABASE_PATH = path.join(directory, 'test.sqlite');
const app = require('../app');
const db = require('../config/database');
let server, base;
before(async () => { server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); fs.rmSync(directory, { recursive: true, force: true }); });
async function request(url, method = 'GET', body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json(), location: response.headers.get('location') };
}
test('CRUD uses SQLite, keeps legacy endpoints, and persists across a separate process', async () => {
  assert.equal((await request('/api/status')).data.database, 'connected');
  assert.equal((await request('/api/dokumen')).data.data.length, 3);
  assert.equal((await request('/api/produk')).data.data.length, 3);
  const created = await request('/api/dokumen', 'POST', { title: '  Modul Test  ', pages: 9, status: 'Diproses' });
  assert.equal(created.status, 201);
  const id = created.data.data.id;
  assert.equal(created.location, `/api/dokumen/${id}`);
  assert.equal(db.prepare('SELECT title FROM documents WHERE id=?').get(id).title, 'Modul Test');
  assert.equal((await request(`/api/dokumen/${id}`)).data.data.pages, 9);
  const updated = await request(`/api/dokumen/${id}`, 'PUT', { title: 'Modul Revisi', pages: 20, status: 'Siap' });
  assert.equal(updated.status, 200);
  assert.equal(db.prepare('SELECT pages FROM documents WHERE id=?').get(id).pages, 20);
  const persisted = execFileSync(process.execPath, ['-e', `const db=require('./config/database'); console.log(JSON.stringify(db.prepare('SELECT * FROM documents WHERE id=?').get(${id}))); db.close();`], { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8' });
  assert.equal(JSON.parse(persisted).title, 'Modul Revisi');
  assert.equal((await request(`/api/dokumen/${id}`, 'DELETE')).status, 200);
  assert.equal(db.prepare('SELECT * FROM documents WHERE id=?').get(id), undefined);
  assert.equal((await request(`/api/dokumen/${id}`)).status, 404);
  assert.equal((await request(`/api/dokumen/${id}`, 'DELETE')).status, 404);
  assert.equal((await request(`/api/dokumen/${id}`, 'PUT', { title: 'Gone', pages: 1, status: 'Siap' })).status, 404);
  const alias = await request('/api/produk', 'POST', { title: 'Alias', pages: 1, status: 'Siap' });
  assert.equal(alias.status, 201);
  assert.equal((await request(`/api/produk/${alias.data.data.id}`)).status, 200);
  assert.equal((await request(`/api/produk/${alias.data.data.id}`, 'PUT', { title: 'Alias edit', pages: 2, status: 'Diproses' })).status, 200);
  assert.equal((await request(`/api/produk/${alias.data.data.id}`, 'DELETE')).status, 200);
});
test('invalid input, malformed JSON, and IDs return appropriate errors', async () => {
  for (const payload of [{}, { title: ' ', pages: 1, status: 'Siap' }, { title: 'Valid', pages: -1, status: 'Siap' }, { title: 'Valid', pages: 1.5, status: 'Siap' }, { title: 'Valid', pages: '2', status: 'Siap' }, { title: 'Valid', pages: 1, status: 'Unknown' }]) assert.equal((await request('/api/dokumen', 'POST', payload)).status, 400);
  for (const id of ['abc', '0', '-1', '1.2', '9007199254740992']) assert.equal((await request(`/api/dokumen/${id}`)).status, 400);
  const malformed = await fetch(base + '/api/dokumen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal((await request('/api/missing')).status, 404);
});
test('EJS escapes stored titles and logger includes method, path, timestamp and status', async () => {
  const original = console.log; const logs = []; console.log = (...args) => logs.push(args.join(' '));
  try {
    const created = await request('/api/dokumen', 'POST', { title: '<script>alert(1)</script>', pages: 1, status: 'Siap' });
    const html = await (await fetch(base + '/')).text();
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!html.includes('<script>alert(1)</script>'));
    await request(`/api/dokumen/${created.data.data.id}`, 'DELETE');
    assert.ok(logs.some(log => /\[\d{4}-.*\] POST \/api\/dokumen - Status: 201/.test(log)));
  } finally { console.log = original; }
});
test('empty catalog stays empty after reopening database (no unwanted reseed)', () => {
  db.exec('DELETE FROM documents');
  const output = execFileSync(process.execPath, ['-e', "const db=require('./config/database'); console.log(db.prepare('SELECT COUNT(*) AS n FROM documents').get().n); db.close()"], { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8' });
  assert.equal(output.trim(), '0');
});
