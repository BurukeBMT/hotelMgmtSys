# Hotel & HR Management System MVP - Setup Guide

## 🎯 Overview

This MVP provides a complete Hotel Management System integrated with HR Management capabilities using React.js frontend, Node.js backend, and MySQL database.

## 🏨 MVP Features

### Hotel Management Module
- **Room Management**: Add, update, delete rooms with types and pricing
- **Booking Management**: Create bookings with guest information and room selection
- **Guest Management**: Store guest profiles and booking history
- **Payment Tracking**: Track payments with different methods
- **Room Availability Dashboard**: Real-time room status monitoring

### HR Management Module
- **Employee Management**: Add employees with department assignments
- **Attendance Tracking**: Mark daily attendance (Present/Absent/Late/On Leave)
- **Payroll Generation**: Auto-calculate monthly salaries based on attendance
- **Department Management**: Organize employees by departments

### Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Admin, Manager, Staff, Client roles
- **Password Security**: Bcrypt hashing for passwords

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS, Axios
- **Backend**: Node.js, Express.js, JWT
- **Database**: MySQL (via XAMPP)
- **Authentication**: JWT tokens

## 📋 Prerequisites

1. **Node.js** (v14 or higher)
2. **XAMPP** (for MySQL database)
3. **Git** (for cloning the repository)

## 🚀 Installation & Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd aHotelManagementSystem

# Install backend dependencies
cd server
npm install
cd ..

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 2: Database Setup

#### Option A: Using XAMPP (Recommended for Windows)

1. **Start XAMPP Services**
   - Open XAMPP Control Panel
   - Start Apache and MySQL services

2. **Run Database Setup**
   ```bash
   # Windows
   setup-mysql.bat
   
   # Linux/Mac
   ./setup-mysql.sh
   ```

#### Option B: Manual Database Setup

1. **Create Database**
   ```sql
   CREATE DATABASE hotel_management;
   ```

2. **Import Schema**
   ```bash
   mysql -u root -p hotel_management < server/database/schema.sql
   ```

3. **Run Setup Script**
   ```bash
   cd server
   node database/setup.js
   cd ..
   ```

### Step 3: Environment Configuration

The `.env` file has been created with the following configuration:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hotel_management
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production_12345
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
DB_CONNECTION_LIMIT=20
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

**Note**: Update the `DB_PASSWORD` if your MySQL has a password, and change the `JWT_SECRET` for production use.

### Step 4: Start the Application

```bash
# Start both backend and frontend
npm run dev

# Or start them separately:
# Backend only
cd server && npm run dev

# Frontend only
cd client && npm start
```

## 🔑 Default Login Credentials

After setup, you can log in with:

- **Username**: admin
- **Password**: admin123
- **Role**: Admin (full access to all modules)

## 📊 Database Schema

### Core Tables
- `users` - System users and authentication
- `departments` - HR departments
- `employees` - Employee information
- `room_types` - Room categories and pricing
- `rooms` - Individual rooms
- `guests` - Guest profiles
- `bookings` - Reservation records
- `payments` - Payment transactions
- `attendance` - Daily attendance records
- `payroll` - Monthly payroll records

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Hotel Management
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Add new room
- `GET /api/bookings` - List all bookings
- `POST /api/bookings` - Create new booking
- `GET /api/guests` - List all guests
- `POST /api/guests` - Add new guest
- `GET /api/payments` - List all payments
- `POST /api/payments` - Create payment

### HR Management
- `GET /api/hr/employees` - List employees
- `POST /api/hr/employees` - Add employee
- `GET /api/hr/departments` - List departments
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/payroll/generate` - Generate payroll
- `GET /api/payroll` - Get payroll records

## 🎨 Frontend Structure

### Pages
- `Dashboard.js` - Main dashboard with statistics
- `HR.js` - HR management interface
- `Bookings.js` - Booking management
- `Rooms.js` - Room management
- `Guests.js` - Guest management
- `Payments.js` - Payment tracking
- `Login.js` - Authentication

### Components
- `Layout.js` - Main layout wrapper
- `AuthContext.js` - Authentication context

## 🔧 Configuration

### Backend Configuration
- Database connection settings in `server/database/config.js`
- JWT secret and expiration in `config.env`
- CORS settings for frontend communication

### Frontend Configuration
- API base URL in `client/src/services/api.js`
- Proxy configuration in `client/package.json`

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL is running in XAMPP
   - Check database credentials in `config.env`
   - Verify database exists: `hotel_management`

2. **Port Already in Use**
   - Change PORT in `config.env`
   - Kill existing processes: `netstat -ano | findstr :5000`

3. **Frontend Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

4. **Authentication Issues**
   - Verify JWT_SECRET in `config.env`
   - Check token expiration settings

### Logs
- Backend logs: `server/logs/`
- Error logs: `server/logs/error.log`
- Combined logs: `server/logs/combined.log`

## 📈 MVP Usage Guide

### For Administrators

1. **Dashboard Overview**
   - View key metrics: bookings, revenue, occupancy
   - Monitor recent activity and upcoming check-ins
   - Quick access to all modules

2. **Room Management**
   - Add new room types with pricing
   - Manage individual rooms and their status
   - View room availability calendar

3. **Booking Management**
   - Create new bookings for guests
   - Update booking status (confirmed, checked-in, checked-out)
   - Generate booking receipts

4. **Guest Management**
   - Add new guest profiles
   - View guest booking history
   - Search and filter guests

5. **HR Management**
   - Add employees to departments
   - Mark daily attendance
   - Generate monthly payroll
   - View HR statistics

### For Staff Users

1. **Limited Access**
   - View assigned bookings
   - Mark attendance (if enabled)
   - Update room status

### For Clients

1. **Self-Service**
   - View own bookings
   - Update profile information
   - Make new bookings (if enabled)

## 🚀 Next Steps (Post-MVP)

### Potential Enhancements
1. **Advanced Analytics**
   - Revenue reports and trends
   - Occupancy analysis
   - Guest demographics

2. **Automation Features**
   - Email notifications
   - Automated check-in/check-out
   - Inventory management

3. **Mobile App**
   - React Native mobile app
   - Push notifications
   - Offline capabilities

4. **Integration Features**
   - Payment gateway integration
   - Third-party booking systems
   - Accounting software integration

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs in `server/logs/`
3. Verify database connectivity
4. Check API endpoints with Postman/curl

## 📄 License

This project is licensed under the MIT License.

---

**Happy Hotel Managing! 🏨✨**
