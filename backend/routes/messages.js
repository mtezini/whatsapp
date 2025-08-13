const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Rotas protegidas para todos os usuários autenticados
router.get('/', protect, messageController.getMessages);
router.get('/stats', protect, messageController.getMessageStats);
router.get('/:id', protect, messageController.getMessage);
router.post('/', protect, messageController.sendMessage);

// Rotas protegidas para admin e manager
router.put('/:id/status', protect, authorize('admin', 'manager'), messageController.updateMessageStatus);
router.delete('/:id', protect, authorize('admin', 'manager'), messageController.deleteMessage);

module.exports = router;