const Contact = require('../models/Contact');
const Message = require('../models/Message');

// Obter todos os contatos
exports.getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Construir query de busca
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Construir opções de ordenação
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Executar consulta paginada
    const contacts = await Contact.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Contar total de documentos
    const total = await Contact.countDocuments(query);
    
    res.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar contatos'
    });
  }
};

// Obter um contato específico
exports.getContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contato não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Erro ao buscar contato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar contato'
    });
  }
};

// Criar um novo contato
exports.createContact = async (req, res) => {
  try {
    const { phoneNumber, name, email, company, tags, notes } = req.body;
    
    // Verificar se o número de telefone já existe
    const existingContact = await Contact.findOne({ phoneNumber });
    if (existingContact) {
      return res.status(400).json({
        success: false,
        error: 'Já existe um contato com este número de telefone'
      });
    }
    
    // Criar novo contato
    const contact = await Contact.create({
      phoneNumber,
      name,
      email,
      company,
      tags,
      notes
    });
    
    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Erro ao criar contato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar contato'
    });
  }
};

// Atualizar um contato existente
exports.updateContact = async (req, res) => {
  try {
    const { name, email, company, tags, notes, isActive } = req.body;
    
    // Encontrar e atualizar contato
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        company,
        tags,
        notes,
        isActive
      },
      { new: true, runValidators: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contato não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar contato'
    });
  }
};

// Excluir um contato
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contato não encontrado'
      });
    }
    
    // Verificar se há mensagens associadas a este contato
    const messageCount = await Message.countDocuments({ contact: req.params.id });
    
    if (messageCount > 0) {
      // Em vez de excluir, marcar como inativo
      contact.isActive = false;
      await contact.save();
      
      return res.json({
        success: true,
        data: {},
        message: 'Contato marcado como inativo pois possui mensagens associadas'
      });
    }
    
    // Se não houver mensagens, excluir completamente
    await contact.remove();
    
    res.json({
      success: true,
      data: {},
      message: 'Contato excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir contato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir contato'
    });
  }
};

// Obter histórico de mensagens de um contato
exports.getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    // Verificar se o contato existe
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contato não encontrado'
      });
    }
    
    // Buscar mensagens do contato
    const messages = await Message.find({ contact: req.params.id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Contar total de mensagens
    const total = await Message.countDocuments({ contact: req.params.id });
    
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
    console.error('Erro ao buscar mensagens do contato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar mensagens do contato'
    });
  }
};