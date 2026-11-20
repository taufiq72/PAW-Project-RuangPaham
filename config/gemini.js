// Server-only configuration. Never expose this object through an API.
exports.getGeminiConfig = () => ({
  apiKey: process.env.GEMINI_API_KEY?.trim(),
  model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  timeoutMs: 20000
});
