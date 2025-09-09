import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      
      setPendingVerification({
        userId: response.data.userId,
        phoneNumber: response.data.phoneNumber,
        type: 'register'
      });
      
      toast.success('Verification code sent to your phone');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (phoneNumber) => {
    try {
      setLoading(true);
      const response = await authAPI.login(phoneNumber);
      
      setPendingVerification({
        userId: response.data.userId,
        phoneNumber: response.data.phoneNumber,
        type: 'login'
      });
      
      toast.success('Verification code sent to your phone');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const verifySMS = async (code) => {
    if (!pendingVerification) {
      return { success: false, error: 'No verification in progress' };
    }

    try {
      setLoading(true);
      const response = pendingVerification.type === 'register' 
        ? await authAPI.verifySMS({ userId: pendingVerification.userId, code })
        : await authAPI.verifyLogin({ userId: pendingVerification.userId, code });
      
      const { token, user: userData } = response.data;
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setPendingVerification(null);
      
      toast.success(pendingVerification.type === 'register' ? 'Account created successfully!' : 'Login successful!');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || 'Verification failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setPendingVerification(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
    localStorage.setItem('user', JSON.stringify({ ...user, ...userData }));
  };

  const value = {
    user,
    loading,
    pendingVerification,
    register,
    login,
    verifySMS,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};