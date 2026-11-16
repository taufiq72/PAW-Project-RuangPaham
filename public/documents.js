'use strict';
const $ = id => document.getElementById(id);
const dialog = $('document-dialog');
const form = $('document-form');
async function api(path = '', options = {}) {
  const response = await fetch(`/api/dokumen${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.errors ? Object.values(result.errors).join(' ') : result.message || 'Request gagal.');
  return result;
}
function render(documents) {
  const fragment = document.createDocumentFragment();
  documents.forEach(doc => {
    const card = document.createElement('article');
    card.dataset.id = doc.id;
    card.className = 'bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg';
    const title = document.createElement('h2');
    title.className = 'font-semibold text-lg text-white mb-2 break-words';
    title.textContent = doc.title;
    const pages = document.createElement('p');
    pages.className = 'text-sm text-gray-400';
    pages.textContent = `Total Halaman: ${doc.pages}`;
    const status = document.createElement('p');
    status.className = 'text-sm text-indigo-300 mt-3';
    status.textContent = doc.status;
    const actions = document.createElement('div');
    actions.className = 'flex gap-4 mt-5';
    [['detail', 'Detail'], ['edit', 'Edit'], ['delete', 'Hapus']].forEach(([action, label]) => {
      const button = document.createElement('button');
      button.dataset.action = action;
      button.textContent = label;
      button.className = action === 'delete' ? 'text-red-300 underline' : 'text-indigo-300 underline';
      actions.append(button);
    });
    card.append(title, pages, status, actions);
    fragment.append(card);
  });
  $('document-list').replaceChildren(fragment);
  window.dispatchEvent(new CustomEvent('documents-updated', { detail: documents }));
  $('document-count').textContent = `${documents.length} dokumen`;
  $('empty-state').hidden = documents.length > 0;
}
async function refresh(message = '') {
  $('refresh').disabled = true;
  $('feedback').textContent = 'Memuat dokumen…';
  try { render((await api()).data); $('feedback').textContent = message; }
  catch (error) { $('feedback').textContent = `${message ? message + ' ' : ''}Daftar gagal dimuat: ${error.message} Klik Muat ulang untuk mencoba lagi.`; }
  finally { $('refresh').disabled = false; }
}
function openForm(doc) {
  form.reset();
  $('document-id').value = doc ? doc.id : '';
  $('form-title').textContent = doc ? 'Edit Dokumen' : 'Tambah Dokumen';
  $('form-error').textContent = '';
  if (doc) { $('title').value = doc.title; $('pages').value = doc.pages; $('status').value = doc.status; }
  dialog.showModal();
  $('title').focus();
}
$('add-document').addEventListener('click', () => openForm());
$('cancel').addEventListener('click', () => dialog.close());
$('refresh').addEventListener('click', () => refresh());
form.addEventListener('submit', async event => {
  event.preventDefault();
  const id = $('document-id').value;
  $('save').disabled = true;
  $('cancel').disabled = true;
  $('form-error').textContent = '';
  try {
    const result = await api(id ? `/${id}` : '', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ title: $('title').value, pages: Number($('pages').value), status: $('status').value }) });
    dialog.close();
    await refresh(result.message);
  } catch (error) { $('form-error').textContent = error.message; }
  finally { $('save').disabled = false; $('cancel').disabled = false; }
});
dialog.addEventListener('cancel', event => { if ($('save').disabled) event.preventDefault(); });
$('document-list').addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.closest('article').dataset.id;
  button.disabled = true;
  try {
    if (button.dataset.action === 'delete') {
      if (!confirm('Hapus dokumen ini? Data yang dihapus tidak dapat dikembalikan.')) return;
      const result = await api(`/${id}`, { method: 'DELETE' });
      await refresh(result.message);
    } else {
      const { data } = await api(`/${id}`);
      if (button.dataset.action === 'edit') openForm(data);
      else {
        $('detail-content').replaceChildren();
        [['ID', data.id], ['Judul', data.title], ['Halaman', data.pages], ['Status', data.status], ['Dibuat', data.created_at], ['Diperbarui', data.updated_at]].forEach(([label, value]) => {
          const dt = document.createElement('dt'); dt.className = 'text-gray-400 text-sm'; dt.textContent = label;
          const dd = document.createElement('dd'); dd.textContent = value;
          $('detail-content').append(dt, dd);
        });
        $('detail-dialog').showModal();
      }
    }
  } catch (error) { $('feedback').textContent = error.message; }
  finally { button.disabled = false; }
});
refresh();
