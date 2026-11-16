const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Ganti model menjadi 'gemini-1.5-flash-latest' atau 'gemini-pro'
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

module.exports = { genAI, model };