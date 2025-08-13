const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Obter status da conexão WhatsApp
router.get('/status', protect, whatsappController.getStatus);

// Enviar mensagem via WhatsApp
router.post('/send', protect, whatsappController.sendMessage);

// Enviar mensagem em massa para vários contatos
router.post('/send-bulk', protect, authorize('admin', 'manager'), whatsappController.sendBulkMessages);

// Reiniciar a sessão do WhatsApp (apenas admin)
router.post('/restart', protect, authorize('admin'), whatsappController.restartSession);

module.exports = router;