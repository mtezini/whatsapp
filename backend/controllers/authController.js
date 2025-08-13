const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

// Gerar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'whatsapp_integration_secret', {
    expiresIn: '30d',
  });
};

// Registrar um novo usuário
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Verificar se o email já está em uso
    connection.query('SELECT * FROM Users WHERE email = ?', [email], async (err, results) => {
      if (err) throw err;

      if (results.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email já está em uso',
        });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário
      connection.query(
        'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role || 'agent'],
        (err, results) => {
          if (err) throw err;

          const token = generateToken(results.insertId);

          res.status(201).json({
            success: true,
            data: {
              id: results.insertId,
              name,
              email,
              role: role || 'agent',
              token,
            },
          });
        }
      );
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar usuário',
    });
  }
};

// Login de usuário
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Verificar se o usuário existe
    connection.query('SELECT * FROM Users WHERE email = ?', [email], async (err, results) => {
      if (err) throw err;

      if (results.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Email ou senha inválidos',
        });
      }

      const user = results[0];

      // Verificar senha
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Email ou senha inválidos',
        });
      }

      // Atualizar último login
      connection.query('UPDATE Users SET last_login = NOW() WHERE id = ?', [user.id], (err) => {
        if (err) throw err;
      });

      // Gerar token
      const token = generateToken(user.id);

      res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token,
        },
      });
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer login',
    });
  }
};

// Obter perfil do usuário atual
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter perfil'
    });
  }
};

// Atualizar perfil do usuário
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, password, profilePicture } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }
    
    // Verificar se o novo email já está em uso
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email já está em uso'
        });
      }
      user.email = email;
    }
    
    // Atualizar campos
    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;
    
    // Atualizar senha se fornecida
    if (password) {
      user.password = password;
    }
    
    // Salvar alterações
    await user.save();
    
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar perfil'
    });
  }
};

// Solicitar redefinição de senha
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Não existe usuário com este email'
      });
    }
    
    // Gerar token de redefinição
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash do token e definir expiração
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutos
    
    await user.save();
    
    // Em uma aplicação real, enviar email com o link de redefinição
    // Aqui apenas retornamos o token para fins de demonstração
    
    res.json({
      success: true,
      message: 'Email de redefinição de senha enviado',
      resetToken // Remover em produção
    });
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao solicitar redefinição de senha'
    });
  }
};

// Redefinir senha
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Hash do token recebido
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Buscar usuário com token válido
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }
    
    // Definir nova senha
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao redefinir senha'
    });
  }
};