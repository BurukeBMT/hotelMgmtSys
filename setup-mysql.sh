#!/bin/bash

echo "Setting up MySQL Database for Hotel Management System"
echo "=================================================="

# Check if MySQL is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo "Error: MySQL is not running. Please start MySQL service first."
    echo "You can start it with: sudo service mysql start"
    exit 1
fi

echo ""
echo "Step 1: Creating database and running schema..."
mysql -u root -p < server/database/schema.sql

echo ""
echo "Step 2: Running database setup script..."
cd server
node database/setup.js
cd ..

echo ""
echo "Step 3: Installing dependencies..."
cd server
npm install
cd ..
cd client
npm install
cd ..

echo ""
echo "Database setup completed!"
echo ""
echo "Default login credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "To start the application:"
echo "1. Ensure MySQL is running"
echo "2. Run: npm run dev"
echo ""

