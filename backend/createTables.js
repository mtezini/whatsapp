const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Conectar ao MySQL
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

const createOrUpdateTables = () => {
  connection.connect((err) => {
    if (err) {
      console.error('Erro ao conectar ao MySQL:', err);
      return;
    }
    console.log('Conexão com MySQL estabelecida com sucesso');

    connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) throw err;
      console.log('Tabela Users criada com sucesso');
    });

    connection.query(`
      CREATE TABLE IF NOT EXISTS Contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `, (err) => {
      if (err) {
        console.error('Erro ao criar tabela Contacts:', err);
        return;
      }
      console.log('Tabela Contacts criada com sucesso');
    });

    connection.query(`
      CREATE TABLE IF NOT EXISTS Messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contact_id INT NOT NULL,
        content TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES Contacts(id)
      )
    `, (err) => {
      if (err) {
        console.error('Erro ao criar tabela Messages:', err);
        return;
      }
      console.log('Tabela Messages criada com sucesso');
    });

    // Adicionar lógica para atualizar tabelas existentes
    const alterUsersTable = `
      ALTER TABLE Users 
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;
    `;

    const alterContactsTable = `
      ALTER TABLE Contacts 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;
    `;

    const alterMessagesTable = `
      ALTER TABLE Messages 
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
    `;

    connection.query(alterUsersTable, (err) => {
      if (err) {
        console.error('Erro ao atualizar tabela Users:', err);
        return;
      }
      console.log('Tabela Users atualizada com sucesso');
    });

    connection.query(alterContactsTable, (err) => {
      if (err) {
        console.error('Erro ao atualizar tabela Contacts:', err);
        return;
      }
      console.log('Tabela Contacts atualizada com sucesso');
    });

    connection.query(alterMessagesTable, (err) => {
      if (err) {
        console.error('Erro ao atualizar tabela Messages:', err);
        return;
      }
      console.log('Tabela Messages atualizada com sucesso');
    });

    // Ensure the `role` column exists in the Users table
    const alterUsersTableRole = `
      ALTER TABLE Users 
      ADD COLUMN IF NOT EXISTS role ENUM('admin', 'manager', 'agent') DEFAULT 'agent';
    `;

    connection.query(alterUsersTableRole, (err) => {
      if (err) {
        console.error('Erro ao atualizar tabela Users com a coluna role:', err);
        return;
      }
      console.log('Tabela Users atualizada com a coluna role.');
    });

    connection.end((err) => {
      if (err) {
        console.error('Erro ao encerrar a conexão com MySQL:', err);
        return;
      }
      console.log('Conexão com MySQL encerrada');
    });
  });
};

module.exports = createOrUpdateTables;
