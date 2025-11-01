/**
 * API Service Module
 *
 * This module uses Axios, a popular JavaScript library for making HTTP requests,
 * to handle all client-server communications in the hotel management system.
 * Axios provides a simple API for performing HTTP requests (GET, POST, PUT, DELETE, etc.)
 * and supports features like request/response interceptors, automatic JSON transformation,
 * and error handling.
 *
 * Key features implemented here:
 * - Base URL configuration for API endpoints
 * - Automatic inclusion of authentication tokens in requests
 * - Centralized error handling, including token expiration
 * - Service modules for different API resources (auth, users, bookings, etc.)
 */

import axios from 'axios';

// Default to a relative `/api` path so CRA dev proxy (set in package.json) can forward requests to the backend.
// You can override by setting REACT_APP_API_URL in client/.env.local when needed.
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log network / server errors to make debugging easier
    if (!error.response) {
      // Network or CORS error
      console.error('[api] Network error or no response received:', error.message);
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Do not hard-redirect here to avoid navigation race conditions; allow caller to handle.
    }

    console.error('[api] Response error:', {
      url: error.config?.url,
      status: error.response.status,
      data: error.response.data,
    });

    return Promise.reject(error);
  }
);

// Auth service
const normalizeUser = (raw) => {
  if (!raw) return null;
  const userData = raw.data ? raw.data : raw; // some endpoints wrap data
  return {
    id: userData.id,
    username: userData.username,
    email: userData.email,
    firstName: userData.first_name,
    lastName: userData.last_name,
    role: userData.role,
    phone: userData.phone,
    address: userData.address,
    createdAt: userData.created_at,
  };
};

export const authService = {
  login: async (credentials) => {
    console.log('🔐 Attempting login with:', credentials);
    const response = await api.post('/auth/login', credentials);
    console.log('📡 Login response:', response.data);
    const payload = response.data;
    const token = payload?.data?.token || payload?.token;
    const user = normalizeUser(payload?.data?.user || payload?.user);
    console.log('👤 Normalized user:', user);
    console.log('🎫 Token:', token);
    return { token, user };
  },

  register: async (registrationData) => {
    const response = await api.post('/auth/register', registrationData);
    const payload = response.data;
    const token = payload?.data?.token || payload?.token;
    const user = normalizeUser(payload?.data?.user || payload?.user);
    return { token, user };
  },

  logout: async () => {
    // server may not have explicit logout; clear client state regardless
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    return { success: true };
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return normalizeUser(response.data);
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return normalizeUser(response.data);
  },
  
  changePassword: async ({ current_password, new_password }) => {
    const response = await api.put('/auth/change-password', { current_password, new_password });
    return response.data;
  },
};

// Users service
export const usersService = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Bookings service
export const bookingsService = {
  getBookings: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },

  getBooking: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  updateBooking: async (id, bookingData) => {
    const response = await api.put(`/bookings/${id}`, bookingData);
    return response.data;
  },

  deleteBooking: async (id) => {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  },
};

// Rooms service
export const roomsService = {
  getRooms: async () => {
    const response = await api.get('/rooms');
    return response.data;
  },

  getRoom: async (id) => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  createRoom: async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },

  updateRoom: async (id, roomData) => {
    const response = await api.put(`/rooms/${id}`, roomData);
    return response.data;
  },

  deleteRoom: async (id) => {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },
};

// Guests service
export const guestsService = {
  getGuests: async () => {
    const response = await api.get('/guests');
    return response.data;
  },

  getGuest: async (id) => {
    const response = await api.get(`/guests/${id}`);
    return response.data;
  },

  createGuest: async (guestData) => {
    const response = await api.post('/guests', guestData);
    return response.data;
  },

  updateGuest: async (id, guestData) => {
    const response = await api.put(`/guests/${id}`, guestData);
    return response.data;
  },

  deleteGuest: async (id) => {
    const response = await api.delete(`/guests/${id}`);
    return response.data;
  },
};

// HR service
export const hrService = {
  getEmployees: async () => {
    const response = await api.get('/hr/employees');
    return response.data;
  },

  getEmployee: async (id) => {
    const response = await api.get(`/hr/employees/${id}`);
    return response.data;
  },

  createEmployee: async (employeeData) => {
    const response = await api.post('/hr/employees', employeeData);
    return response.data;
  },

  updateEmployee: async (id, employeeData) => {
    const response = await api.put(`/hr/employees/${id}`, employeeData);
    return response.data;
  },

  deleteEmployee: async (id) => {
    const response = await api.delete(`/hr/employees/${id}`);
    return response.data;
  },

  getDepartments: async () => {
    const response = await api.get('/hr/departments');
    return response.data;
  },
};

// Payments service
export const paymentsService = {
  getPayments: async () => {
    const response = await api.get('/payments');
    return response.data;
  },

  getPayment: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  createPayment: async (paymentData) => {
    const response = await api.post('/payments', paymentData);
    return response.data;
  },

  updatePayment: async (id, paymentData) => {
    const response = await api.put(`/payments/${id}`, paymentData);
    return response.data;
  },

  deletePayment: async (id) => {
    const response = await api.delete(`/payments/${id}`);
    return response.data;
  },
  createCheckoutSession: async (data) => {
    const response = await api.post('/stripe/create-checkout-session', data);
    return response.data;
  }
};

// Admin service
export const adminService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getUserPrivileges: async (id) => {
    const response = await api.get(`/admin/users/${id}/privileges`);
    return response.data;
  },

  grantPrivilege: async (id, privilege) => {
    const response = await api.post(`/admin/users/${id}/privileges`, { privilege });
    return response.data;
  },

  revokePrivilege: async (id, privilege) => {
    const response = await api.delete(`/admin/users/${id}/privileges/${privilege}`);
    return response.data;
  },

  getPrivileges: async () => {
    const response = await api.get('/admin/privileges');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard-stats');
    return response.data;
  },

  getRecentActivity: async () => {
    const response = await api.get('/admin/recent-activity');
    return response.data;
  },
};

// Pricing service
export const pricingService = {
  getPriceTracking: async (params = {}) => {
    const response = await api.get('/pricing/tracking', { params });
    return response.data;
  },

  createPriceTracking: async (data) => {
    const response = await api.post('/pricing/tracking', data);
    return response.data;
  },

  updatePriceTracking: async (id, data) => {
    const response = await api.put(`/pricing/tracking/${id}`, data);
    return response.data;
  },

  deletePriceTracking: async (id) => {
    const response = await api.delete(`/pricing/tracking/${id}`);
    return response.data;
  },

  getCurrentPricing: async (roomTypeId, date) => {
    const response = await api.get(`/pricing/current/${roomTypeId}`, { params: { date } });
    return response.data;
  },

  calculatePricing: async (data) => {
    const response = await api.post('/pricing/calculate', data);
    return response.data;
  },

  getPricingAnalytics: async (period) => {
    const response = await api.get(`/pricing/analytics?period=${period}`);
    return response.data;
  },

  getRoomTypes: async () => {
    const response = await api.get('/rooms/types');
    return response.data;
  }
};

// Cabins service
export const cabinsService = {
  getCabins: async (params = {}) => {
    const response = await api.get('/cabins', { params });
    return response.data;
  },

  getCabin: async (id) => {
    const response = await api.get(`/cabins/${id}`);
    return response.data;
  },

  createCabin: async (data) => {
    const response = await api.post('/cabins', data);
    return response.data;
  },

  updateCabin: async (id, data) => {
    const response = await api.put(`/cabins/${id}`, data);
    return response.data;
  },

  deleteCabin: async (id) => {
    const response = await api.delete(`/cabins/${id}`);
    return response.data;
  },

  getCabinAvailability: async (id, startDate, endDate) => {
    const response = await api.get(`/cabins/${id}/availability`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  getCabinTypes: async () => {
    const response = await api.get('/cabins/types/list');
    return response.data;
  },

  getCabinLocations: async () => {
    const response = await api.get('/cabins/locations/list');
    return response.data;
  }
};

// Payment Gateway service
export const paymentGatewayService = {
  getPaymentMethods: async () => {
    const response = await api.get('/payment-gateway/methods');
    return response.data;
  },

  processPayment: async (data) => {
    const response = await api.post('/payment-gateway/process', data);
    return response.data;
  },

  getPaymentHistory: async (params = {}) => {
    const response = await api.get('/payment-gateway/history', { params });
    return response.data;
  },

  processRefund: async (data) => {
    const response = await api.post('/payment-gateway/refund', data);
    return response.data;
  },

  getPaymentAnalytics: async (period) => {
    const response = await api.get(`/payment-gateway/analytics?period=${period}`);
    return response.data;
  }
};

// Notifications service
export const notificationsService = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getNotificationCount: async () => {
    const response = await api.get('/notifications/count');
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  createNotification: async (data) => {
    const response = await api.post('/notifications', data);
    return response.data;
  },

  getNotificationAnalytics: async (period) => {
    const response = await api.get(`/notifications/analytics?period=${period}`);
    return response.data;
  }
};

// Reports service
export const reportsService = {
  getDashboardStats: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },

  getBookingStats: async (period) => {
    const response = await api.get(`/reports/bookings?period=${period}`);
    return response.data;
  },

  getRevenueStats: async (period) => {
    const response = await api.get(`/reports/revenue?period=${period}`);
    return response.data;
  },

  getOccupancyStats: async (period) => {
    const response = await api.get(`/reports/occupancy?period=${period}`);
    return response.data;
  },
};

export default api;
