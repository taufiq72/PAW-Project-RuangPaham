(() => {
  const el = id => document.getElementById(id);
  const form = el('chat-form'), input = el('chat-message'), send = el('chat-send');
  const selector = el('chat-document'), messages = el('chat-messages');
  let busy = false;
  window.addEventListener('documents-updated', ({ detail }) => {
    const previous = selector.value;
    selector.replaceChildren(new Option('Semua dokumen', ''));
    detail.forEach(d => selector.add(new Option(d.title, d.id)));
    if (detail.some(d => String(d.id) === previous)) selector.value = previous;
  });
  function append(text, user = false) {
    const bubble = document.createElement('p');
    bubble.className = 'chat-bubble' + (user ? ' chat-user' : '');
    bubble.textContent = text;
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (busy || !message) return;
    busy = true; send.disabled = true; selector.disabled = true;
    el('chat-error').textContent = ''; el('chat-loading').hidden = false;
    messages.setAttribute('aria-busy', 'true');
    append(message, true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ message, ...(selector.value ? { documentId: Number(selector.value) } : {}) })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Layanan AI tidak tersedia.');
      if (typeof result.data?.reply !== 'string') throw new Error('Respons server tidak valid.');
      append(result.data.reply);
      if (input.value.trim() === message) input.value = '';
    } catch (error) {
      el('chat-error').textContent = error.name === 'TypeError' || error.name === 'TimeoutError' ? 'Koneksi gagal atau waktu tunggu habis. Coba kirim lagi.' : error.message;
    } finally {
      busy = false; send.disabled = false; selector.disabled = false;
      el('chat-loading').hidden = true; messages.setAttribute('aria-busy', 'false'); input.focus();
    }
  });
})();
