const router = require('express').Router();
router.post('/', require('../middlewares/validateChatInput'), require('../controllers/chatController').handleChat);
module.exports = router;
