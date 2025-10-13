# Hotel & HR Management System MVP

A complete Hotel Management System integrated with HR Management capabilities built with Node.js, MySQL, and React.js. This MVP provides essential hotel operations including booking management, room management, guest management, payment tracking, employee management, attendance tracking, and payroll generation.

## Features

### 🏨 Core Management
- **Booking Management**: Create, view, and manage hotel bookings
- **Room Management**: Manage room types, availability, and pricing
- **Guest Management**: Maintain guest profiles and booking history
- **Payment Processing**: Track payments and transactions
- **HR Management**: Manage employees, departments, and roles

### 📊 Analytics & Reporting
- **Dashboard**: Real-time overview with key metrics
- **Revenue Reports**: Monthly and yearly revenue analysis
- **Occupancy Reports**: Room utilization and availability
- **Guest Analytics**: Demographics and preferences
- **Employee Reports**: Performance and statistics

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin, Manager, Staff roles
- **Input Validation**: Comprehensive form validation
- **Rate Limiting**: API protection against abuse

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Interface**: Clean, intuitive user interface
- **Real-time Updates**: Live data updates and notifications
- **Interactive Charts**: Visual data representation

## Tech Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MySQL**: Database (via XAMPP)
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **express-validator**: Input validation
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing

### Frontend
- **React.js**: UI framework
- **React Router**: Navigation
- **Axios**: API communication
- **React Hot Toast**: Notifications
- **Tailwind CSS**: Styling
- **Lucide React**: Icons

## Installation

### Prerequisites
- Node.js (v14 or higher)
- XAMPP (for MySQL database)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel-management-system
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Environment Configuration**
   ```bash
   # The .env file is already created with default values
   # Update database credentials, JWT secret, etc. if needed
   # Default configuration works with XAMPP MySQL
   ```

4. **Set up the database**
   ```bash
   # Start XAMPP MySQL service
   # Then run database setup
   setup-mysql.bat  # Windows
   ./setup-mysql.sh # Linux/Mac
   ```

5. **Start the development servers**
   ```bash
   # Start both backend and frontend
   npm run dev
   
   # Or start them separately:
   # Backend only
   npm run server
   
   # Frontend only
   cd client && npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Bookings
- `GET /api/bookings` - List all bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `GET /api/bookings/dashboard/stats` - Booking statistics

### Rooms
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/types` - List room types
- `POST /api/rooms` - Add new room
- `GET /api/rooms/availability` - Check room availability

### Guests
- `GET /api/guests` - List all guests
- `POST /api/guests` - Add new guest
- `PUT /api/guests/:id` - Update guest
- `GET /api/guests/:id/bookings` - Guest booking history

### HR Management
- `GET /api/hr/employees` - List employees
- `GET /api/hr/departments` - List departments
- `POST /api/hr/employees` - Add employee
- `GET /api/hr/dashboard` - HR statistics

### Payments
- `GET /api/payments` - List all payments
- `POST /api/payments` - Create payment
- `GET /api/payments/dashboard/stats` - Payment statistics

### Reports
- `GET /api/reports/revenue` - Revenue reports
- `GET /api/reports/occupancy` - Occupancy reports
- `GET /api/reports/bookings` - Booking reports
- `GET /api/reports/dashboard-summary` - Dashboard summary

## Database Schema

The system uses MySQL with the following main tables:

- **users**: System users and authentication
- **departments**: Hotel departments
- **employees**: Employee information
- **room_types**: Room categories and pricing
- **rooms**: Individual rooms
- **guests**: Guest profiles
- **bookings**: Reservation records
- **payments**: Payment transactions
- **attendance**: Daily attendance records
- **payroll**: Monthly payroll records

## Default Credentials

After running the database setup, you can log in with:

- **Username**: admin
- **Password**: admin123

## Development

### Project Structure
```
hotel-management-system/
├── server/                 # Backend code
│   ├── database/          # Database configuration
│   ├── middleware/        # Express middleware
│   ├── routes/           # API routes
│   └── index.js          # Server entry point
├── client/               # Frontend code
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── App.tsx       # Main app component
│   └── public/           # Static files
├── package.json          # Backend dependencies
└── client/package.json   # Frontend dependencies
```

### Available Scripts

**Backend:**
- `npm run server` - Start development server
- `npm run setup-db` - Initialize database

**Frontend:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

**Both:**
- `npm run dev` - Start both servers concurrently

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.