(() => {
  const el = id => document.getElementById(id);
  const form = el('chat-form'), input = el('chat-message'), send = el('chat-send');
  const selector = el('chat-document'), messages = el('chat-messages');
  const mode = el('chat-mode'), summary = el('chat-summary'), active = el('chat-active');
  const key = 'ruangpaham-study-v1';
  let busy = false, documents = [], history = [];
  let preferred = '';
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (Array.isArray(saved?.history)) history = saved.history.slice(-100);
    if (saved?.mode === 'pdf') mode.value = 'pdf';
    if (/^\d+$/.test(saved?.selected || '')) preferred = saved.selected;
  } catch { /* Storage may be blocked. */ }
  const save = () => {
    try { sessionStorage.setItem(key, JSON.stringify({ history, mode: mode.value, selected: selector.value })); }
    catch { /* Chat still works without session storage. */ }
  };

  function redrawOptions() {
    const pdf = mode.value === 'pdf';
    const choices = documents.filter(doc => !pdf || doc.pdf_status === 'Siap');
    selector.replaceChildren(new Option(pdf ? 'Pilih materi PDF' : 'Semua dokumen', ''));
    for (const doc of choices) selector.add(new Option(doc.title, doc.id));
    selector.value = choices.some(doc => String(doc.id) === preferred) ? preferred : '';
    sync();
  }
  function sync() {
    const pdf = mode.value === 'pdf';
    const selected = documents.find(doc => String(doc.id) === selector.value);
    active.textContent = selected ? `Materi aktif: ${selected.title}` : pdf ? 'Pilih PDF yang sudah Siap.' : '';
    input.placeholder = pdf ? 'Contoh: Apa isi kesimpulan materi ini?' : 'Apa saja dokumen yang tersedia?';
    summary.hidden = !pdf;
    summary.disabled = busy || !selected;
    send.disabled = busy || (pdf && !selected);
    selector.disabled = busy; mode.disabled = busy;
  }
  window.addEventListener('documents-updated', ({ detail }) => { documents = detail; redrawOptions(); });
  selector.addEventListener('change', () => { preferred = selector.value; sync(); save(); });
  mode.addEventListener('change', () => { redrawOptions(); save(); });

  function show(entry) {
    if (typeof entry?.text !== 'string') return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble' + (entry.user ? ' chat-user' : '');
    const text = document.createElement('p'); text.textContent = entry.text; bubble.append(text);
    if (Array.isArray(entry.sources)) {
      const links = document.createElement('ul'); links.className = 'chat-sources';
      for (const source of entry.sources) {
        if (!/^\/api\/dokumen\/\d+\/pdf\?revision=[a-f0-9-]{36}#page=\d+$/.test(source?.url)) continue;
        const item = document.createElement('li'), link = document.createElement('a');
        link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = `${source.title} — halaman ${source.page}`;
        item.append(link);
        if (typeof source.quote === 'string') {
          const quote = document.createElement('blockquote'); quote.textContent = source.quote; item.append(quote);
        }
        links.append(item);
      }
      if (links.children.length) bubble.append(links);
    }
    if (/^[a-f0-9-]{36}$/.test(entry.answerId || '')) {
      const controls = document.createElement('div'), status = document.createElement('p');
      controls.className = 'chat-feedback'; status.setAttribute('role', 'status');
      const done = () => {
        controls.replaceChildren(status);
        status.textContent = `Penilaian tersimpan: ${entry.helpful ? 'Membantu' : 'Tidak Membantu'}.`;
      };
      if (typeof entry.helpful === 'boolean') done();
      else {
        const buttons = ['Membantu', 'Tidak Membantu'].map((label, index) => {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
          button.addEventListener('click', async () => {
            buttons.forEach(b => { b.disabled = true; }); status.textContent = '';
            try {
              const response = await fetch(`/api/chat/answers/${entry.answerId}/feedback`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ helpful: index === 0 }), signal: AbortSignal.timeout(10000)
              });
              const result = await response.json();
              if (!response.ok || !result.success) throw new Error(result.message);
              entry.helpful = result.data.helpful; save(); done();
            } catch (error) {
              status.textContent = error.message || 'Penilaian belum tersimpan.'; buttons.forEach(b => { b.disabled = false; });
            }
          });
          return button;
        });
        controls.append(...buttons, status);
      }
      bubble.append(controls);
    }
    messages.append(bubble); messages.scrollTop = messages.scrollHeight;
  }
  function append(entry) {
    history.push(entry); history = history.slice(-100); save(); show(entry);
  }
  for (const entry of history) show(entry);
  sync();

  async function ask(message, action) {
    if (busy || !message || (mode.value === 'pdf' && !selector.value)) return;
    const selected = selector.value;
    busy = true; sync();
    el('chat-error').textContent = ''; el('chat-loading').hidden = false;
    messages.setAttribute('aria-busy', 'true');
    append({ text: message, user: true });
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ message, mode: mode.value, ...(selected ? { documentId: Number(selected) } : {}), ...(action ? { action } : {}) })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Layanan AI tidak tersedia.');
      if (typeof result.data?.reply !== 'string') throw new Error('Respons server tidak valid.');
      append({ text: result.data.reply, sources: result.data.sources, answerId: result.data.answerId });
      if (!action && input.value.trim() === message) input.value = '';
    } catch (error) {
      el('chat-error').textContent = error.name === 'TypeError' || error.name === 'TimeoutError' ? 'Koneksi gagal atau waktu tunggu habis. Coba kirim lagi.' : error.message;
    } finally {
      busy = false; sync(); el('chat-loading').hidden = true; messages.setAttribute('aria-busy', 'false'); input.focus();
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); void ask(input.value.trim()); });
  summary.addEventListener('click', () => { void ask('Ringkas Materi', 'summary'); });
})();