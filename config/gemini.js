// Server-only configuration. Never expose this object through an API.
exports.getGeminiConfig = () => ({
  apiKey: process.env.GEMINI_API_KEY?.trim(),
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  timeoutMs: 20000
});
