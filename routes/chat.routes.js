const router = require('express').Router();
router.post('/', require('../middlewares/validateChatInput'), require('../controllers/chatController').handleChat);
router.post('/answers/:id/feedback', require('../controllers/chatController').rate);
module.exports = router;
