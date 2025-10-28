const { query } = require('./database/config');

async function updateSchema() {
  try {
    console.log(' Updating database schema for Chapa integration...');
    
    await query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS chapa_payment_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS chapa_checkout_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS chapa_response JSON,
      ADD COLUMN IF NOT EXISTS webhook_data JSON,
      ADD COLUMN IF NOT EXISTS verification_data JSON,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS chapa_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id INT,
        tx_ref VARCHAR(100) UNIQUE NOT NULL,
        chapa_payment_id VARCHAR(100),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ETB',
        status VARCHAR(20) DEFAULT 'pending',
        customer_email VARCHAR(100),
        customer_first_name VARCHAR(50),
        customer_last_name VARCHAR(50),
        customer_phone VARCHAR(20),
        checkout_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
      )
    `);

    console.log(' Database schema updated successfully!');
  } catch (error) {
    console.error(' Error updating schema:', error);
  }
}

updateSchema();
