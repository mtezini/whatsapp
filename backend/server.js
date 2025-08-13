const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar o app Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar ao MySQL
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
  } else {
    console.log('MySQL conectado com sucesso');
  }
});

// Importar rotas
const authRoutes = require('./routes/auth');
const whatsappRoutes = require('./routes/whatsapp');
const messageRoutes = require('./routes/messages');
const contactRoutes = require('./routes/contacts');

// Usar rotas
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);

// Rota para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.json({ message: 'API de integração WhatsApp funcionando!' });
});

// Inicializar o serviço WhatsApp
const whatsappService = require('./services/whatsappService');
whatsappService.initialize();

// Importar script de criação/atualização de tabelas
const createOrUpdateTables = require('./createTables');

// Executar criação ou atualização de tabelas ao iniciar o servidor
createOrUpdateTables();

// Definir a porta

const PORT = process.env.PORT || 5001;

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});