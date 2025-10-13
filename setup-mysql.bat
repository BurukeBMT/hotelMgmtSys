@echo off
echo Setting up MySQL Database for Hotel Management System
echo ==================================================

echo.
echo Step 1: Starting XAMPP MySQL Service...
"C:\xampp\mysql\bin\mysql.exe" --version
if %errorlevel% neq 0 (
    echo Error: XAMPP MySQL not found. Please ensure XAMPP is installed and MySQL service is running.
    echo You can start MySQL from XAMPP Control Panel.
    pause
    exit /b 1
)

echo.
echo Step 2: Creating database and running schema...
"C:\xampp\mysql\bin\mysql.exe" -u root -p -e "source server/database/schema.sql"

echo.
echo Step 3: Running database setup script...
cd server
node database/setup.js
cd ..

echo.
echo Step 4: Installing dependencies...
cd server
npm install
cd ..
cd client
npm install
cd ..

echo.
echo Database setup completed!
echo.
echo Default login credentials:
echo Username: admin
echo Password: admin123
echo.
echo To start the application:
echo 1. Start XAMPP MySQL service
echo 2. Run: npm run dev
echo.
pause

