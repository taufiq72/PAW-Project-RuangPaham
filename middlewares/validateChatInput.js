const validateChatInput = (req, res, next) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Pesan tidak boleh kosong.'
        });
    }

    if (message.length > 1000) {
        return res.status(400).json({
            success: false,
            message: 'Pesan terlalu panjang (maksimal 1000 karakter).'
        });
    }

    req.body.message = message.trim();
    next();
};

module.exports = validateChatInput;