const Message = require('../models/Message');
const Contact = require('../models/Contact');
const whatsappService = require('../services/whatsappService');

// Obter todas as mensagens
exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50, direction, contactId, startDate, endDate } = req.query;
    
    // Construir query de busca
    const query = {};
    
    if (direction) {
      query.direction = direction;
    }
    
    if (contactId) {
      query.contact = contactId;
    }
    
    // Filtrar por intervalo de datas
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Executar consulta paginada
    const messages = await Message.find(query)
      .populate('contact', 'name phoneNumber')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Contar total de documentos
    const total = await Message.countDocuments(query);
    
    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar mensagens'
    });
  }
};

// Obter uma mensagem específica
exports.getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id).populate('contact', 'name phoneNumber');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Mensagem não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Erro ao buscar mensagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar mensagem'
    });
  }
};

// Enviar uma nova mensagem
exports.sendMessage = async (req, res) => {
  try {
    const { contactId, content, mediaUrl } = req.body;
    
    // Verificar se o contato existe
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contato não encontrado'
      });
    }
    
    // Determinar o tipo de mensagem
    let messageType = 'text';
    if (mediaUrl) {
      // Lógica para determinar o tipo de mídia baseado na URL ou extensão
      const fileExtension = mediaUrl.split('.').pop().toLowerCase();
      
      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        messageType = 'image';
      } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
        messageType = 'audio';
      } else if (['mp4', 'avi', 'mov'].includes(fileExtension)) {
        messageType = 'video';
      } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(fileExtension)) {
        messageType = 'document';
      }
    }
    
    // Enviar mensagem via WhatsApp
    const result = await whatsappService.sendMessage(contact.phoneNumber, content);
    
    if (result.success) {
      // Criar registro da mensagem no banco de dados
      const message = await Message.create({
        contact: contactId,
        direction: 'outgoing',
        messageType,
        content,
        mediaUrl,
        whatsappMessageId: result.messageId,
        status: 'sent'
      });
      
      // Atualizar último contato
      contact.lastContact = Date.now();
      await contact.save();
      
      res.status(201).json({
        success: true,
        data: message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Erro ao enviar mensagem via WhatsApp'
      });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar mensagem'
    });
  }
};

// Atualizar status de uma mensagem
exports.updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['sent', 'delivered', 'read', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status inválido'
      });
    }
    
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Mensagem não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Erro ao atualizar status da mensagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status da mensagem'
    });
  }
};

// Excluir uma mensagem (soft delete)
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Mensagem não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: {},
      message: 'Mensagem excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir mensagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir mensagem'
    });
  }
};

// Obter estatísticas de mensagens
exports.getMessageStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Construir query de busca com intervalo de datas
    const query = {};
    
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Estatísticas gerais
    const totalMessages = await Message.countDocuments(query);
    const incomingMessages = await Message.countDocuments({ ...query, direction: 'incoming' });
    const outgoingMessages = await Message.countDocuments({ ...query, direction: 'outgoing' });
    
    // Estatísticas por status
    const messagesByStatus = await Message.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Estatísticas por tipo de mensagem
    const messagesByType = await Message.aggregate([
      { $match: query },
      { $group: { _id: '$messageType', count: { $sum: 1 } } }
    ]);
    
    // Formatar resultados
    const statusStats = {};
    messagesByStatus.forEach(item => {
      statusStats[item._id] = item.count;
    });
    
    const typeStats = {};
    messagesByType.forEach(item => {
      typeStats[item._id] = item.count;
    });
    
    res.json({
      success: true,
      data: {
        total: totalMessages,
        incoming: incomingMessages,
        outgoing: outgoingMessages,
        byStatus: statusStats,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de mensagens:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas de mensagens'
    });
  }
};