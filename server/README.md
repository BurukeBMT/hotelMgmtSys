# Hotel Management System - Backend Server

Express.js backend API for the Hotel Management System, using Firebase Admin SDK for database and authentication.

## Features

- RESTful API endpoints
- Firebase Admin SDK integration
- JWT token authentication
- Role-based access control
- Error handling middleware
- CORS support
- Security headers (Helmet)

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Firebase Admin SDK Setup

You have two options to configure Firebase Admin SDK:

#### Option A: Using Service Account JSON File (Recommended for local development)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `heaven-project-7bb83`
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Save the JSON file as `server/serviceAccountKey.json`

#### Option B: Using Environment Variables (Recommended for production)

1. From Firebase Console > Service Accounts, get the following:
   - Project ID
   - Client Email
   - Private Key
2. Add them to your `.env` file:
   ```
   FIREBASE_PROJECT_ID=heaven-project-7bb83
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@xxxxx.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_DATABASE_URL=https://xxxxx.firebaseio.com
   ```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 4. Run the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will run on `http://localhost:5000` (or the PORT specified in .env)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (verify token)
- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/dashboard` - Get booking statistics
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking
- `POST /api/bookings/:id/check-in` - Check in guest
- `POST /api/bookings/:id/check-out` - Check out guest

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms` - Create new room (admin only)
- `PUT /api/rooms/:id` - Update room (admin only)
- `DELETE /api/rooms/:id` - Delete room (admin only)

### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/:id` - Get guest by ID
- `POST /api/guests` - Create new guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest (admin only)

### HR Management
- `GET /api/hr/employees` - Get all employees
- `POST /api/hr/employees` - Create employee
- `GET /api/hr/departments` - Get all departments
- `POST /api/hr/departments` - Create department
- `GET /api/hr/attendance` - Get attendance records
- `POST /api/hr/attendance` - Create attendance record
- `GET /api/hr/payroll` - Get payroll records
- `POST /api/hr/payroll` - Generate payroll
- `GET /api/hr/dashboard` - Get HR dashboard stats

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (super admin only)

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID
- `POST /api/payments` - Create payment
- `POST /api/payments/stripe/create-checkout-session` - Create Stripe session
- `PUT /api/payments/:id` - Update payment

### Admin
- `GET /api/admin/dashboard` - Get admin dashboard stats
- `GET /api/admin/reports/bookings` - Get booking reports
- `GET /api/admin/reports/revenue` - Get revenue reports
- `GET /api/admin/reports/occupancy` - Get occupancy reports

## Authentication

Most endpoints require authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## Role-Based Access Control

- **client**: Basic access
- **staff**: Staff operations
- **manager**: Management operations
- **admin**: Administrative operations
- **super_admin**: Full system access

## Deployment to Render.com

1. Push your code to GitHub
2. Connect your repository to Render
3. Create a new Web Service
4. Set the following:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables in Render dashboard:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (copy the entire key including `\n`)
   - `FIREBASE_DATABASE_URL`
   - `CORS_ORIGIN` (your frontend URL)
   - `JWT_SECRET` (generate a random string)
6. Deploy!

Alternatively, use the `render.yaml` file in the root directory for automatic configuration.

## Notes

- The server uses Firebase Admin SDK for server-side operations
- Client-side still uses Firebase SDK for authentication
- All data operations go through the backend API
- Update your frontend API base URL to point to your Render deployment

