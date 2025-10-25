const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotel_management'
  });

  try {
    console.log('🔧 Aligning database schema with server expectations...');

    // room_types.capacity (populate from max_occupancy if exists)
    const [capacityCol] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'room_types' AND COLUMN_NAME = 'capacity'`,
      [process.env.DB_NAME || 'hotel_management']
    );
    if (capacityCol.length === 0) {
      console.log('🛠️ Adding `capacity` column to `room_types`...');
      await connection.execute(`ALTER TABLE room_types ADD COLUMN capacity INT NULL AFTER base_price`);
      // Try to populate from max_occupancy if available
      const [mx] = await connection.execute(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'room_types' AND COLUMN_NAME = 'max_occupancy'`, [process.env.DB_NAME || 'hotel_management']);
      if (mx.length > 0) {
        await connection.execute(`UPDATE room_types SET capacity = max_occupancy WHERE capacity IS NULL`);
      }
      console.log('✅ room_types.capacity added');
    } else {
      console.log('ℹ️ room_types.capacity already exists');
    }

    // guests.name
    const [guestNameCol] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'name'`,
      [process.env.DB_NAME || 'hotel_management']
    );
    if (guestNameCol.length === 0) {
      console.log('🛠️ Adding `name` column to `guests`...');
      await connection.execute(`ALTER TABLE guests ADD COLUMN name VARCHAR(150) NULL AFTER last_name`);
      await connection.execute(`UPDATE guests SET name = CONCAT(IFNULL(first_name,''), ' ', IFNULL(last_name,'')) WHERE name IS NULL`);
      console.log('✅ guests.name added and populated');
    } else {
      console.log('ℹ️ guests.name already exists');
    }

    // rooms.type, rooms.notes, rooms.is_clean
    const [roomTypeCol] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'type'`,
      [process.env.DB_NAME || 'hotel_management']
    );
    if (roomTypeCol.length === 0) {
      console.log('🛠️ Adding `type` column to `rooms`...');
      await connection.execute(`ALTER TABLE rooms ADD COLUMN type VARCHAR(100) NULL AFTER room_type_id`);
      // Populate from room_types.name
      await connection.execute(`UPDATE rooms r JOIN room_types rt ON r.room_type_id = rt.id SET r.type = rt.name WHERE r.type IS NULL`);
      console.log('✅ rooms.type added and populated');
    } else {
      console.log('ℹ️ rooms.type already exists');
    }

    const [isCleanCol] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'is_clean'`,
      [process.env.DB_NAME || 'hotel_management']
    );
    if (isCleanCol.length === 0) {
      console.log('🛠️ Adding `is_clean` column to `rooms`...');
      await connection.execute(`ALTER TABLE rooms ADD COLUMN is_clean BOOLEAN DEFAULT TRUE AFTER status`);
      console.log('✅ rooms.is_clean added');
    } else {
      console.log('ℹ️ rooms.is_clean already exists');
    }

    const [notesCol] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'notes'`,
      [process.env.DB_NAME || 'hotel_management']
    );
    if (notesCol.length === 0) {
      console.log('🛠️ Adding `notes` column to `rooms`...');
      // Add after is_clean if that column exists
      const [hasIsClean] = await connection.execute(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'is_clean'`, [process.env.DB_NAME || 'hotel_management']);
      if (hasIsClean.length > 0) {
        await connection.execute(`ALTER TABLE rooms ADD COLUMN notes TEXT NULL AFTER is_clean`);
      } else {
        await connection.execute(`ALTER TABLE rooms ADD COLUMN notes TEXT NULL`);
      }
      console.log('✅ rooms.notes added');
    } else {
      console.log('ℹ️ rooms.notes already exists');
    }

    // bookings.created_by
    const [createdByCol] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'created_by'`,
      [process.env.DB_NAME || 'hotel_management']
    );
    if (createdByCol.length === 0) {
      console.log('🛠️ Adding `created_by` column to `bookings`...');
      await connection.execute(`ALTER TABLE bookings ADD COLUMN created_by INT NULL AFTER updated_at`);
      console.log('✅ bookings.created_by added');
    } else {
      console.log('ℹ️ bookings.created_by already exists');
    }

    // price_tracking table
    const [priceTrackingTable] = await connection.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'price_tracking'`,
      [process.env.DB_NAME || 'hotel_management']
    );
    if (priceTrackingTable.length === 0) {
      console.log('🛠️ Creating `price_tracking` table...');
      await connection.execute(`
        CREATE TABLE price_tracking (
          id INT PRIMARY KEY AUTO_INCREMENT,
          room_type_id INT NOT NULL,
          base_price DECIMAL(10,2) NOT NULL,
          seasonal_multiplier DECIMAL(5,2) DEFAULT 1.00,
          weekend_multiplier DECIMAL(5,2) DEFAULT 1.20,
          holiday_multiplier DECIMAL(5,2) DEFAULT 1.50,
          demand_multiplier DECIMAL(5,2) DEFAULT 1.00,
          final_price DECIMAL(10,2) NOT NULL,
          effective_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ price_tracking table created');
    } else {
      console.log('ℹ️ price_tracking table already exists');
    }

    console.log('✅ Schema alignment complete');
  } catch (err) {
    console.error('❌ Error running schema alignment:', err.message || err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) runMigrations();

module.exports = { runMigrations };
