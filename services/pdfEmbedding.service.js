const { getGeminiConfig } = require('../config/gemini');

const dimension = 256;
const model = () => process.env.GEMINI_EMBEDDING_MODEL?.trim();
exports.embeddingModel = model;
exports.chunksFor = pages => pages.flatMap(({ page, text }) => {
  const parts = [];
  for (let start = 0; start < text.length; start += 1300) parts.push({ page, text: text.slice(start, start + 1500) });
  return parts;
});

async function request(name, apiKey, method, body, signal, fetchImpl) {
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, signal, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Embedding request failed');
  return response.json();
}
const payload = (name, text, taskType) => ({ model: `models/${name}`, content: { parts: [{ text }] }, taskType, outputDimensionality: dimension });
const vector = ({ values } = {}) => {
  if (!Array.isArray(values) || values.length !== dimension || !values.every(Number.isFinite)) throw new Error('Invalid embedding');
  const norm = Math.hypot(...values);
  if (!norm) throw new Error('Empty embedding');
  return values.map(value => value / norm);
};

exports.indexPages = async (pages, { fetchImpl = fetch } = {}) => {
  const name = model(), { apiKey } = getGeminiConfig();
  if (!name || !apiKey || pages.reduce((total, p) => total + p.text.length, 0) <= 24000) return null;
  const chunks = exports.chunksFor(pages), vectors = [];
  const signal = AbortSignal.timeout(15000);
  for (let start = 0; start < chunks.length; start += 32) {
    const requests = chunks.slice(start, start + 32).map(c => payload(name, c.text, 'RETRIEVAL_DOCUMENT'));
    const { embeddings } = await request(name, apiKey, 'batchEmbedContents', { requests }, signal, fetchImpl);
    if (embeddings?.length !== requests.length) throw new Error('Incomplete embedding batch');
    vectors.push(...embeddings.map(vector));
  }
  return { name, vectors };
};

exports.embedQuestion = async (name, text, { fetchImpl = fetch } = {}) => {
  const { apiKey } = getGeminiConfig();
  return vector((await request(name, apiKey, 'embedContent', payload(name, text, 'RETRIEVAL_QUERY'), AbortSignal.timeout(2500), fetchImpl)).embedding);
};