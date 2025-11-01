import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/api';
import { auth } from '../config/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is already logged in on app start
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          try {
            const userData = await authService.getProfile();
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (e) {
            console.error('Error fetching user profile:', e);
            // Still set basic user info from Firebase Auth
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email,
              username: firebaseUser.email?.split('@')[0] || '',
            });
          }
        } else {
          // User is signed out
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      console.log('🚀 AuthContext: Starting login process');
      const response = await authService.login({ username, password });
      console.log('✅ AuthContext: Login service response:', response);

      if (response.user) {
        // Token is automatically handled by Firebase Auth
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
        console.log('💾 AuthContext: User data saved to localStorage and state');
        toast.success('Login successful!');
      } else {
        console.error('❌ AuthContext: Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('💥 AuthContext: Login error:', error);
      const errorMessage = error.message || 'Login failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Even if logout fails on server, clear local state
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (error) {
      const errorMessage = error.message || 'Profile update failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      if (auth.currentUser) {
        const userData = await authService.getProfile();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      // If refresh fails, user might be logged out
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
