const whatsappService = require('../services/whatsappService');
const { connection } = require('../models/Contact');

// Obter status da conexão WhatsApp
exports.getStatus = async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Erro ao obter status do WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter status do WhatsApp',
    });
  }
};

// Enviar mensagem via WhatsApp
exports.sendMessage = async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Número de telefone e mensagem são obrigatórios',
      });
    }

    // Verificar se o contato existe, se não, criar
    connection.query('SELECT * FROM Contacts WHERE phone_number = ?', [to], (err, results) => {
      if (err) throw err;

      let contactId;

      if (results.length === 0) {
        connection.query(
          'INSERT INTO Contacts (phone_number, name) VALUES (?, ?)',
          [to, `Contato ${to}`],
          (err, insertResults) => {
            if (err) throw err;
            contactId = insertResults.insertId;
            sendMessageAndSave(contactId);
          }
        );
      } else {
        contactId = results[0].id;
        sendMessageAndSave(contactId);
      }
    });

    const sendMessageAndSave = (contactId) => {
      whatsappService.sendMessage(to, message).then((result) => {
        if (result.success) {
          connection.query(
            'INSERT INTO Messages (contact_id, direction, content, whatsapp_message_id, status) VALUES (?, ?, ?, ?, ?)',
            [contactId, 'outgoing', message, result.messageId, 'sent'],
            (err) => {
              if (err) throw err;
              res.json({
                success: true,
                messageId: result.messageId,
              });
            }
          );
        } else {
          res.status(500).json({
            success: false,
            error: result.error,
          });
        }
      });
    };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar mensagem',
    });
  }
};

// Enviar mensagem em massa para vários contatos
exports.sendBulkMessages = async (req, res) => {
  try {
    const { contacts, message } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0 || !message) {
      return res.status(400).json({
        success: false,
        error: 'Lista de contatos e mensagem são obrigatórios',
      });
    }

    const results = [];
    const errors = [];

    // Enviar mensagem para cada contato
    for (const contactId of contacts) {
      try {
        const contact = await Contact.findById(contactId);
        if (!contact) {
          errors.push({ contactId, error: 'Contato não encontrado' });
          continue;
        }

        const result = await whatsappService.sendMessage(contact.phoneNumber, message);

        if (result.success) {
          // Salvar mensagem no banco de dados
          await Message.create({
            contact: contact._id,
            direction: 'outgoing',
            content: message,
            whatsappMessageId: result.messageId,
            status: 'sent',
          });

          // Atualizar último contato
          contact.lastContact = Date.now();
          await contact.save();

          results.push({ contactId, success: true, messageId: result.messageId });
        } else {
          errors.push({ contactId, error: result.error });
        }
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${contactId}:`, error);
        errors.push({ contactId, error: 'Erro interno ao processar mensagem' });
      }
    }

    res.json({
      success: true,
      totalSent: results.length,
      totalFailed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagens em massa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar mensagens em massa',
    });
  }
};

// Reiniciar a sessão do WhatsApp
exports.restartSession = async (req, res) => {
  try {
    // Lógica para reiniciar a sessão do WhatsApp
    // Isso depende da implementação específica do whatsapp-web.js

    res.json({
      success: true,
      message: 'Sessão do WhatsApp está sendo reiniciada. Escaneie o QR code quando aparecer.',
    });
  } catch (error) {
    console.error('Erro ao reiniciar sessão do WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao reiniciar sessão do WhatsApp',
    });
  }
};