const { model } = require('../config/gemini');

async function generateDocumentChatResponse(userMessage, documentTitle, documentContext) {
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

    // 1. Jika mode mock diaktifkan di .env atau API key kosong
    if (provider === 'mock' || !process.env.GEMINI_API_KEY) {
        return `[Mode Mock RuangPaham AI]: Berdasarkan dokumen aktif "${documentTitle}", penjelasan untuk pertanyaan "${userMessage}" adalah informasi terkait dapat dipelajari melalui materi modul praktikum [Halaman 3][cite: 9].`;
    }

    try {
        const systemInstruction = `
        Anda adalah AI Assistant resmi untuk platform RuangPaham AI, asisten belajar berbasis dokumen perkuliahan.
        
        ATURAN KETAT (GUARDRAIL & RAG):
        1. Anda hanya boleh menjawab pertanyaan berdasarkan isi teks dokumen aktif yang diberikan di bawah ini.
        2. Dokumen Aktif Saat Ini: "${documentTitle || 'Tidak ada dokumen dipilih'}".
        3. Setiap klaim atau jawaban wajib mencantumkan rujukan halaman sumber yang valid (Contoh Format Rujukan: [Halaman X]).
        4. Jika informasi tidak ditemukan di dalam teks dokumen, jawab persis dengan kalimat:
           "Informasi tidak ditemukan dalam materi yang dipilih"
        
        ---
        TEKS DOKUMEN SUMBER:
        ${documentContext || 'Tidak ada konten dokumen yang dimuat.'}
        ---
        `;

        const prompt = `${systemInstruction}\n\nPertanyaan Mahasiswa: "${userMessage}"`;

        // Menggunakan model standar gemini-1.5-flash
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error('Gemini API Error, beralih ke Mock Response:', error.message);
        
        // 2. Fallback otomatis ke mode mock agar frontend tetap menerima jawaban sukses
        return `[RuangPaham AI - Response]: Berdasarkan dokumen perkuliahan "${documentTitle}"[cite: 9], pertanyaan Anda mengenai "${userMessage}" telah terdaftar dalam modul. (Catatan: Layanan AI online sedang sibuk/error, sistem menggunakan mode backup lokal).`;
    }
}

module.exports = { generateDocumentChatResponse };