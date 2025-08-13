const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

// Create Messages table if it doesn't exist
connection.query(`
  CREATE TABLE IF NOT EXISTS Messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    direction ENUM('incoming', 'outgoing') NOT NULL,
    message_type ENUM('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'other') DEFAULT 'text',
    content TEXT NOT NULL,
    media_url VARCHAR(255),
    whatsapp_message_id VARCHAR(255),
    status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES Contacts(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) throw err;
  console.log('Messages table ensured.');
});

module.exports = connection;