const jwt = require('jsonwebtoken');
const { connection } = require('../models/User');

// Middleware para proteger rotas
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Verificar se o token está no header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Extrair token do header
      token = req.headers.authorization.split(' ')[1];
    }

    // Verificar se o token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado, token não fornecido',
      });
    }

    try {
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'whatsapp_integration_secret');

      // Consultar usuário no banco de dados
      connection.query('SELECT * FROM Users WHERE id = ?', [decoded.id], (err, results) => {
        if (err) {
          console.error('Erro ao consultar usuário:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro no servidor',
          });
        }

        if (results.length === 0) {
          return res.status(401).json({
            success: false,
            error: 'Usuário não encontrado',
          });
        }

        const user = results[0];

        if (!user.is_active) {
          return res.status(401).json({
            success: false,
            error: 'Conta desativada',
          });
        }

        // Adicionar usuário ao request
        req.user = user;
        next();
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado, token inválido',
      });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro no servidor',
    });
  }
};

// Middleware para verificar permissões de usuário
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para acessar este recurso',
      });
    }

    next();
  };
};