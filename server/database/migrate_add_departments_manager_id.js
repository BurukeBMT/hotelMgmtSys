const { pool } = require('./config');
const logger = require('../middleware/logger').logger || console;

(async () => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'manager_id'
    `);

    if (rows && rows[0] && rows[0].cnt > 0) {
      logger.info('Column manager_id already exists on departments, skipping');
    } else {
      logger.info('Adding manager_id column to departments');
      await connection.query(`ALTER TABLE departments ADD COLUMN manager_id INT NULL`);
      // Add foreign key if users table exists
      const [u] = await connection.query(`SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`);
      if (u && u[0] && u[0].cnt > 0) {
        try {
          await connection.query(`ALTER TABLE departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL`);
        } catch (fkErr) {
          // foreign key may already exist or fail if names conflict; ignore safely
          logger.warn('Could not add foreign key for manager_id:', fkErr.message);
        }
      }
      logger.info('manager_id column added to departments');
    }
  } catch (err) {
    logger.error('Migration error (add manager_id):', err.message || err);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
})();
