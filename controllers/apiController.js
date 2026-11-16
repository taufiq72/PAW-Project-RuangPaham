const DocumentModel = require('../models/documentModel');
const { generateDocumentChatResponse } = require('../services/gemini.service');

exports.getStatus = (req, res) => {
    res.status(200).json({ status: 'success', message: 'API RuangPaham is running' });
};

exports.getProducts = (req, res) => {
    try {
        const docs = DocumentModel.getAll ? DocumentModel.getAll() : [];
        res.status(200).json({ success: true, data: docs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createDocument = (req, res) => {
    try {
        const newDoc = DocumentModel.create ? DocumentModel.create(req.body) : req.body;
        res.status(201).json({ success: true, data: newDoc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDocument = (req, res) => {
    try {
        const doc = DocumentModel.getById ? DocumentModel.getById(req.params.id) : null;
        if (!doc) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
        res.status(200).json({ success: true, data: doc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDocument = (req, res) => {
    try {
        const updated = DocumentModel.update ? DocumentModel.update(req.params.id, req.body) : req.body;
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteDocument = (req, res) => {
    try {
        if (DocumentModel.delete) DocumentModel.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Dokumen berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.validateBody = (req, res, next) => {
    next();
};

exports.validateId = (req, res, next) => {
    next();
};

// ==========================================
// PPAW Week 10: Controller AI Chat Assistant
// ==========================================
exports.handleChat = async (req, res) => {
    try {
        const { message, documentId } = req.body;

        // Konteks dokumen aktif untuk RAG RuangPaham AI
        const documentTitle = "Modul_PPAW_Minggu10.pdf";
        const documentContext = "Halaman 1: RuangPaham AI adalah platform asisten belajar interaktif berbasis dokumen perkuliahan. Halaman 3: Fitur utama meliputi unggah PDF, pemilihan dokumen aktif, dan tanya jawab berbasis RAG dengan rujukan halaman.";

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
            message: error.message || 'Terjadi kesalahan pada server AI.'
        });
    }
};