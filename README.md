# Hotel & HR Management System

A complete Hotel Management System integrated with HR Management capabilities built with Firebase and React.js. This full-stack application provides essential hotel operations including booking management, room management, guest management, payment tracking, employee management, attendance tracking, and payroll generation.

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
- **Firebase Authentication**: Secure email/password authentication
- **Role-based Access Control**: Admin, Manager, Staff, Client roles
- **Firestore Security Rules**: Database-level security enforcement
- **Input Validation**: Comprehensive form validation

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Interface**: Clean, intuitive user interface
- **Real-time Updates**: Live data updates and notifications
- **Interactive Charts**: Visual data representation

## Tech Stack

### Backend Services (Firebase)
- **Firebase Authentication**: User authentication and session management
- **Cloud Firestore**: NoSQL database for data storage
- **Firebase Storage**: File and image storage

### Frontend
- **React.js**: UI framework
- **React Router**: Navigation
- **Firebase SDK**: Backend integration
- **React Hot Toast**: Notifications
- **Tailwind CSS**: Styling
- **Lucide React**: Icons

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account and project

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel-management-system
   ```

2. **Install dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Firebase Configuration**
   - Firebase is already configured in `client/src/config/firebase.js`
   - Firebase project ID: `heaven-project-7bb83`
   
4. **Set up Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project: `heaven-project-7bb83`
   - Enable Authentication → Email/Password provider
   - Create Firestore Database (production mode)
   - Apply security rules from `firestore.rules`
   - Apply storage rules from `storage.rules`

5. **Start the development server**
   ```bash
   cd client
   npm start
   ```
   
   The app will open at `http://localhost:3000`

## Firebase Services

All data operations use Firebase SDK directly from the client:

### Authentication
- `authService.login()` - User login
- `authService.register()` - User registration
- `authService.getProfile()` - Get user profile
- `authService.updateProfile()` - Update user profile

### Data Collections (Firestore)
- **users** - System users and authentication
- **departments** - Hotel departments
- **employees** - Employee information
- **rooms** - Individual rooms with room types
- **guests** - Guest profiles
- **bookings** - Reservation records
- **payments** - Payment transactions
- **notifications** - User notifications
- **pricing** - Price tracking data
- **cabins** - Cabin listings (if applicable)

All services are available in `client/src/services/firebaseService.js`

### Firestore Document Structure

Documents use Firebase UID as document IDs where applicable. See `FIREBASE_MIGRATION.md` for detailed schema information.

## Authentication

- Users can register with email/password
- Login supports both username and email
- Role-based access control (super_admin, admin, manager, staff, client)
- Sessions persist automatically via Firebase Auth

## Development

### Project Structure
```
hotel-management-system/
├── client/                       # Frontend code (React + Firebase)
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── contexts/            # React contexts (AuthContext)
│   │   ├── pages/               # Page components
│   │   ├── services/            # Firebase services
│   │   │   ├── api.jsx          # Service exports
│   │   │   └── firebaseService.js # Firebase SDK operations
│   │   ├── config/              # Firebase configuration
│   │   │   └── firebase.js      # Firebase init
│   │   └── App.jsx              # Main app component
│   ├── public/                  # Static files
│   └── package.json             # Frontend dependencies
├── firestore.rules              # Firestore security rules
├── storage.rules                # Firebase Storage rules
├── FIREBASE_MIGRATION.md        # Detailed migration guide
└── MIGRATION_SUMMARY.md         # Quick migration summary
```

### Available Scripts

**Frontend:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Deployment

### Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
cd client && npm run build
firebase deploy
```

### Alternative Static Hosting
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

## Migration from MySQL

This project was migrated from Node.js/Express/MySQL to Firebase. See:
- `FIREBASE_MIGRATION.md` - Complete migration documentation
- `MIGRATION_SUMMARY.md` - Quick reference

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.

For Firebase documentation:
- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)