const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Criar diretório para sessão se não existir
const sessionDir = path.resolve(process.env.WHATSAPP_SESSION_DATA_PATH || './whatsapp-session');
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Inicializar o cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: sessionDir
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Eventos do cliente WhatsApp
client.on('qr', (qr) => {
  console.log('QR Code recebido, escaneie-o com seu telefone:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Cliente WhatsApp está pronto!');
});

client.on('authenticated', () => {
  console.log('Autenticado com sucesso no WhatsApp!');
});

client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
  console.log('Cliente WhatsApp desconectado:', reason);
});

// Manipulador de mensagens recebidas
client.on('message', async (message) => {
  try {
    console.log(`Mensagem recebida de ${message.from}: ${message.body}`);
    
    // Aqui você pode adicionar lógica para processar mensagens recebidas
    // Por exemplo, salvar no banco de dados ou responder automaticamente
    
    // Exemplo de resposta automática
    if (message.body.toLowerCase().includes('olá') || message.body.toLowerCase().includes('ola')) {
      await message.reply('Olá! Como posso ajudar você hoje?');
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
});

// Função para inicializar o cliente
const initialize = () => {
  console.log('Inicializando cliente WhatsApp...');
  client.initialize().catch(err => {
    console.error('Erro ao inicializar cliente WhatsApp:', err);
  });
};

// Função para enviar mensagem
const sendMessage = async (to, message) => {
  try {
    // Formatar número se necessário
    const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
    
    // Enviar mensagem
    const response = await client.sendMessage(formattedNumber, message);
    return { success: true, messageId: response.id._serialized };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return { success: false, error: error.message };
  }
};

// Função para obter informações de contato
const getContactInfo = async (contactId) => {
  try {
    const contact = await client.getContactById(contactId);
    return contact;
  } catch (error) {
    console.error('Erro ao obter informações de contato:', error);
    throw error;
  }
};

// Função para verificar status do cliente
const getStatus = () => {
  return {
    authenticated: client.authStrategy.authenticated,
    connected: client.info ? true : false
  };
};

module.exports = {
  initialize,
  sendMessage,
  getContactInfo,
  getStatus,
  client
};