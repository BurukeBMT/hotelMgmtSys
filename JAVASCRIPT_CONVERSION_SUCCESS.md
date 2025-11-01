# 🎉 Hotel Management System - JavaScript Version

## ⚠️ **NOTE: This document is outdated**

**This project has been migrated from Node.js/Express/MySQL to Firebase.**

Current architecture:
- **Frontend**: React.js with Firebase SDK
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Database**: Cloud Firestore (NoSQL)

See `FIREBASE_MIGRATION.md` and `MIGRATION_SUMMARY.md` for current setup instructions.

---

## ✅ **Historical Status (Pre-Migration):**

### 🖥️ **Services Running (Old Setup):**
- ✅ **Server**: Running on port 5000
- ✅ **Client**: Running on port 3001 (React app)
- ✅ **XAMPP**: MySQL and Apache services running (deprecated)
- ✅ **Database**: Connected and operational (deprecated)

### 🌐 **Access URLs (Old Setup):**
- **🏨 Hotel Management App**: http://localhost:3001
- **🔧 Server API**: http://localhost:5000/api/health (deprecated)
- **🗄️ phpMyAdmin**: http://localhost/phpmyadmin (deprecated)

### 📊 **Default Login Credentials:**
- **Username**: `admin`
- **Password**: `admin123`

## 🔄 **What Was Converted:**

### ✅ **TypeScript → JavaScript Conversion:**
- ✅ `App.tsx` → `App.js`
- ✅ `index.tsx` → `index.js`
- ✅ `AuthContext.tsx` → `AuthContext.js`
- ✅ All page components converted
- ✅ All component files converted
- ✅ Removed TypeScript dependencies
- ✅ Updated import statements
- ✅ Removed type annotations

### 🗑️ **Files Removed:**
- ❌ `tsconfig.json`
- ❌ All `.tsx` and `.ts` files
- ❌ TypeScript dependencies from package.json

## 🚀 **How to Start the Project:**

### **Option 1: Start Both Services**
```bash
# From root directory
npm run dev
```

### **Option 2: Start Individually**
```bash
# Start server
npm run server

# Start client (in another terminal)
cd client && npm start
```

### **Option 3: Check Status**
```bash
npm run check-status-win
```

## 🔧 **Troubleshooting:**

### **Port Conflicts:**
- If port 3000 is busy, the client will automatically use port 3001
- If port 5000 is busy, change PORT in config.env

### **Database Issues:**
- Ensure XAMPP MySQL service is running
- Run `npm run test-connection` to verify database connection

### **Client Issues:**
- Clear browser cache if you see old TypeScript errors
- Restart the client with `npm start` in the client directory

## 📁 **Project Structure:**
```
aHotelManagementSystem/
├── server/           # Node.js backend (JavaScript)
├── client/           # React frontend (JavaScript)
├── config.env        # Environment configuration
├── package.json      # Root package.json
└── setup scripts     # XAMPP setup and status check
```

## 🎯 **Next Steps:**
1. **Open the application**: http://localhost:3001
2. **Login with admin credentials**
3. **Explore the hotel management features**
4. **Start managing your hotel!**

---

**🎉 Your hotel management system is now running as a pure JavaScript application with XAMPP!**
