const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Rotas protegidas para todos os usuários autenticados
router.get('/', protect, contactController.getContacts);
router.get('/:id', protect, contactController.getContact);
router.get('/:id/messages', protect, contactController.getContactMessages);

// Rotas protegidas para admin e manager
router.post('/', protect, authorize('admin', 'manager'), contactController.createContact);
router.put('/:id', protect, authorize('admin', 'manager'), contactController.updateContact);
router.delete('/:id', protect, authorize('admin'), contactController.deleteContact);

module.exports = router;