const { generateDocumentChatResponse } = require('../services/gemini.service');
// Jika ingin mengambil data dari model dokumen yang sudah ada:
// const DocumentModel = require('../models/documentModel');

const handleChat = async (req, res) => {
    try {
        const { message, documentId } = req.body;

        // Simulasi konteks dokumen aktif sesuai PRD RuangPaham AI
        const documentTitle = "Modul_PPAW_Minggu10.pdf";
        const documentContext = "Halaman 1: RuangPaham AI adalah platform asisten belajar... Halaman 3: Fitur utama mencakup unggah PDF dan tanya jawab RAG berbasis dokumen.";

        if (!documentContext) {
            return res.status(400).json({
                success: false,
                message: 'Silakan pilih dokumen aktif terlebih dahulu.'
            });
        }

        const reply = await generateDocumentChatResponse(message, documentTitle, documentContext);

        return res.status(200).json({
            success: true,
            data: {
                reply,
                sourceDocument: documentTitle
            }
        });
    } catch (error) {
        console.error('Chat Controller Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Terjadi kesalahan pada server.'
        });
    }
};

module.exports = { handleChat };