const router = require('express').Router();
const controller = require('../controllers/apiController');
const validateChatInput = require('../middlewares/validateChatInput');

router.get('/status', controller.getStatus);

// ==========================================
// PPAW Week 10: Endpoint AI Chat Assistant
// ==========================================
router.post('/chat', validateChatInput, controller.handleChat);

// Resource sesuai tema project; /produk dipertahankan sebagai alias Week 7.
for (const resource of ['/dokumen', '/produk']) {
  router.get(resource, controller.getProducts);
  router.post(resource, controller.validateBody, controller.createDocument);
  router.get(`${resource}/:id`, controller.validateId, controller.getDocument);
  router.put(`${resource}/:id`, controller.validateId, controller.validateBody, controller.updateDocument);
  router.delete(`${resource}/:id`, controller.validateId, controller.deleteDocument);
}

module.exports = router;