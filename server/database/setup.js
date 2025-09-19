const { query } = require('./config');

const createTables = async () => {
  try {
    console.log('🗄️ Setting up database tables...');

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        phone VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create trigger for updated_at
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Departments table
    await query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        manager_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users(id)
      )
    `);

    // Employees table (HR Management)
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        employee_id VARCHAR(20) UNIQUE NOT NULL,
        department_id INTEGER,
        position VARCHAR(100) NOT NULL,
        hire_date DATE NOT NULL,
        salary DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'active',
        emergency_contact VARCHAR(100),
        emergency_phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
      CREATE TRIGGER update_employees_updated_at 
        BEFORE UPDATE ON employees 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Room types table
    await query(`
      CREATE TABLE IF NOT EXISTS room_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        base_price DECIMAL(10,2) NOT NULL,
        capacity INTEGER NOT NULL,
        amenities JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Rooms table
    await query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        room_number VARCHAR(10) UNIQUE NOT NULL,
        room_type_id INTEGER,
        floor INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'available',
        is_clean BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_type_id) REFERENCES room_types(id)
      )
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
      CREATE TRIGGER update_rooms_updated_at 
        BEFORE UPDATE ON rooms 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Guests table
    await query(`
      CREATE TABLE IF NOT EXISTS guests (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        id_type VARCHAR(20),
        id_number VARCHAR(50),
        nationality VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
      CREATE TRIGGER update_guests_updated_at 
        BEFORE UPDATE ON guests 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_number VARCHAR(20) UNIQUE NOT NULL,
        guest_id INTEGER,
        room_id INTEGER,
        cabin_id INTEGER,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        adults INTEGER DEFAULT 1,
        children INTEGER DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'confirmed',
        special_requests TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guest_id) REFERENCES guests(id),
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (cabin_id) REFERENCES cabins(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
      CREATE TRIGGER update_bookings_updated_at 
        BEFORE UPDATE ON bookings 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Payments table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending',
        transaction_id VARCHAR(100),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      )
    `);

    // Maintenance table
    await query(`
      CREATE TABLE IF NOT EXISTS maintenance (
        id SERIAL PRIMARY KEY,
        room_id INTEGER,
        issue_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        assigned_to INTEGER,
        reported_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        notes TEXT,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (reported_by) REFERENCES users(id)
      )
    `);

    // Inventory table
    await query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2),
        supplier VARCHAR(100),
        reorder_level INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
      CREATE TRIGGER update_inventory_updated_at 
        BEFORE UPDATE ON inventory 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Admin privileges table
    await query(`
      CREATE TABLE IF NOT EXISTS admin_privileges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        privilege VARCHAR(50) NOT NULL,
        granted_by INTEGER NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id),
        UNIQUE(user_id, privilege)
      )
    `);

    // Client bookings table (for client-specific bookings)
    await query(`
      CREATE TABLE IF NOT EXISTS client_bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        booking_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      )
    `);

    // Price tracking table
    await query(`
      CREATE TABLE IF NOT EXISTS price_tracking (
        id SERIAL PRIMARY KEY,
        room_type_id INTEGER NOT NULL,
        base_price DECIMAL(10,2) NOT NULL,
        seasonal_multiplier DECIMAL(3,2) DEFAULT 1.00,
        weekend_multiplier DECIMAL(3,2) DEFAULT 1.20,
        holiday_multiplier DECIMAL(3,2) DEFAULT 1.50,
        demand_multiplier DECIMAL(3,2) DEFAULT 1.00,
        final_price DECIMAL(10,2) NOT NULL,
        effective_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_type_id) REFERENCES room_types(id)
      )
    `);

    // Cabins table (for different accommodation types)
    await query(`
      CREATE TABLE IF NOT EXISTS cabins (
        id SERIAL PRIMARY KEY,
        cabin_number VARCHAR(20) UNIQUE NOT NULL,
        cabin_type VARCHAR(50) NOT NULL,
        capacity INTEGER NOT NULL,
        amenities JSONB,
        location VARCHAR(100),
        status VARCHAR(20) DEFAULT 'available',
        base_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_cabins_updated_at ON cabins;
      CREATE TRIGGER update_cabins_updated_at 
        BEFORE UPDATE ON cabins 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Payment methods table
    await query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Guest preferences table
    await query(`
      CREATE TABLE IF NOT EXISTS guest_preferences (
        id SERIAL PRIMARY KEY,
        guest_id INTEGER NOT NULL,
        room_preference VARCHAR(50),
        floor_preference INTEGER,
        amenities_preference JSONB,
        special_requests TEXT,
        loyalty_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
      )
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_guest_preferences_updated_at ON guest_preferences;
      CREATE TRIGGER update_guest_preferences_updated_at 
        BEFORE UPDATE ON guest_preferences 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Staff schedules table
    await query(`
      CREATE TABLE IF NOT EXISTS staff_schedules (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        shift_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        shift_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    // Notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL,
        is_read BOOLEAN DEFAULT false,
        priority VARCHAR(10) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Room availability calendar
    await query(`
      CREATE TABLE IF NOT EXISTS room_availability (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        date DATE NOT NULL,
        is_available BOOLEAN DEFAULT true,
        price_override DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        UNIQUE(room_id, date)
      )
    `);

    // Insert default data
    await insertDefaultData();

    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
};

const insertDefaultData = async () => {
  try {
    // Insert default super admin user
    const superAdminPassword = await require('bcryptjs').hash('superadmin123', 10);
    await query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['superadmin', 'superadmin@hotel.com', superAdminPassword, 'Super', 'Admin', 'super_admin']);

    // Insert default admin user
    const adminPassword = await require('bcryptjs').hash('admin123', 10);
    await query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', 'admin@hotel.com', adminPassword, 'Admin', 'User', 'admin']);

    // Insert default departments
    await query(`
      INSERT INTO departments (name, description) VALUES
      ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10), ($11, $12)
      ON CONFLICT DO NOTHING
    `, [
      'Front Office', 'Handles guest check-in, check-out, and general inquiries',
      'Housekeeping', 'Responsible for room cleaning and maintenance',
      'Food & Beverage', 'Manages restaurant, bar, and room service',
      'Maintenance', 'Handles building and equipment maintenance',
      'Human Resources', 'Manages employee relations and recruitment',
      'Finance', 'Handles accounting and financial operations'
    ]);

    // Insert default room types
    await query(`
      INSERT INTO room_types (name, description, base_price, capacity, amenities) VALUES
      ($1, $2, $3, $4, $5),
      ($6, $7, $8, $9, $10),
      ($11, $12, $13, $14, $15),
      ($16, $17, $18, $19, $20)
      ON CONFLICT DO NOTHING
    `, [
      'Standard', 'Comfortable room with basic amenities', 100.00, 2, JSON.stringify(['WiFi', 'TV', 'AC', 'Private Bathroom']),
      'Deluxe', 'Spacious room with premium amenities', 150.00, 2, JSON.stringify(['WiFi', 'TV', 'AC', 'Private Bathroom', 'Mini Bar', 'City View']),
      'Suite', 'Luxury suite with separate living area', 250.00, 4, JSON.stringify(['WiFi', 'TV', 'AC', 'Private Bathroom', 'Mini Bar', 'City View', 'Living Room', 'Kitchenette']),
      'Presidential Suite', 'Ultimate luxury with all amenities', 500.00, 6, JSON.stringify(['WiFi', 'TV', 'AC', 'Private Bathroom', 'Mini Bar', 'City View', 'Living Room', 'Kitchen', 'Jacuzzi', 'Butler Service'])
    ]);

    // Insert default cabins
    await query(`
      INSERT INTO cabins (cabin_number, cabin_type, capacity, amenities, location, base_price) VALUES
      ($1, $2, $3, $4, $5, $6),
      ($7, $8, $9, $10, $11, $12),
      ($13, $14, $15, $16, $17, $18),
      ($19, $20, $21, $22, $23, $24)
      ON CONFLICT (cabin_number) DO NOTHING
    `, [
      'CABIN-001', 'Mountain View Cabin', 4, JSON.stringify(['Fireplace', 'Kitchen', 'Balcony', 'WiFi']), 'Mountain Side', 200.00,
      'CABIN-002', 'Lake View Cabin', 6, JSON.stringify(['Lake View', 'Kitchen', 'Hot Tub', 'WiFi']), 'Lake Front', 300.00,
      'CABIN-003', 'Forest Cabin', 2, JSON.stringify(['Nature View', 'Fireplace', 'WiFi']), 'Forest Area', 150.00,
      'CABIN-004', 'Luxury Cabin', 8, JSON.stringify(['Private Pool', 'Kitchen', 'Game Room', 'WiFi']), 'Premium Location', 500.00
    ]);

    // Insert default payment methods
    await query(`
      INSERT INTO payment_methods (name, type, is_active, config) VALUES
      ($1, $2, $3, $4),
      ($5, $6, $7, $8),
      ($9, $10, $11, $12),
      ($13, $14, $15, $16),
      ($17, $18, $19, $20),
      ($21, $22, $23, $24)
      ON CONFLICT DO NOTHING
    `, [
      'Credit Card', 'card', true, JSON.stringify({processor: 'stripe', currency: 'USD'}),
      'Debit Card', 'card', true, JSON.stringify({processor: 'stripe', currency: 'USD'}),
      'PayPal', 'digital_wallet', true, JSON.stringify({processor: 'paypal', currency: 'USD'}),
      'Bank Transfer', 'bank_transfer', true, JSON.stringify({processor: 'manual', currency: 'USD'}),
      'Cash', 'cash', true, JSON.stringify({processor: 'manual', currency: 'USD'}),
      'Chapa Payment', 'mobile_money', true, JSON.stringify({processor: 'chapa', currency: 'ETB'})
    ]);

    // Insert default price tracking data
    await query(`
      INSERT INTO price_tracking (room_type_id, base_price, seasonal_multiplier, weekend_multiplier, holiday_multiplier, demand_multiplier, final_price, effective_date) VALUES
      ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE),
      ($8, $9, $10, $11, $12, $13, $14, CURRENT_DATE),
      ($15, $16, $17, $18, $19, $20, $21, CURRENT_DATE),
      ($22, $23, $24, $25, $26, $27, $28, CURRENT_DATE)
      ON CONFLICT DO NOTHING
    `, [
      1, 100.00, 1.00, 1.20, 1.50, 1.00, 100.00,
      2, 150.00, 1.00, 1.20, 1.50, 1.00, 150.00,
      3, 250.00, 1.00, 1.20, 1.50, 1.00, 250.00,
      4, 500.00, 1.00, 1.20, 1.50, 1.00, 500.00
    ]);

    console.log('✅ Default data inserted successfully!');
  } catch (error) {
    console.error('❌ Error inserting default data:', error);
  }
};

if (require.main === module) {
  createTables();
}

module.exports = { createTables }; 