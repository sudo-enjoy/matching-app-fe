import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthはAuthProvider内で使用する必要があります');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(null);

  const validateToken = async (token) => {
    try {
      // Make a simple request to validate the token
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Only return false for actual 401 Unauthorized
      if (response.status === 401) {
        return false;
      }

      // For any other response (including errors), assume token is valid
      return true;
    } catch (error) {
      // If backend is not running or network error, assume token is valid
      // This prevents logout due to temporary network issues
      console.log('Token validation error (assuming valid):', error.message);
      return true;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);

          // Validate token if backend is running
          const isValidToken = await validateToken(token);

          if (isValidToken) {
            setUser(parsedUser);
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      }

      setLoading(false);
    };

    initializeAuth();
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

      toast.success('認証コードをあなたの電話に送信しました');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || '登録に失敗しました';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (phoneNumber) => {
    console.log('=========', phoneNumber);

    try {
      setLoading(true);
      const response = await authAPI.login(phoneNumber);

      setPendingVerification({
        userId: response.data.userId,
        phoneNumber: response.data.phoneNumber,
        type: 'login'
      });

      toast.success('認証コードをあなたの電話に送信しました');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || 'ログインに失敗しました';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const verifySMS = async (code) => {
    if (!pendingVerification) {
      return { success: false, error: '進行中の認証がありません' };
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
      console.log('aaaaaaaaaa', userData);

      // Display user location in console on login
      if (userData && userData.location && userData.location.coordinates) {
        console.log('═══════════════════════════════════════════');
        console.log('🎉 LOGIN SUCCESSFUL - USER LOCATION');
        console.log('═══════════════════════════════════════════');
        console.log(`👤 User: ${userData.name || 'Unknown'}`);
        console.log(`📍 Latitude: ${userData.location.coordinates[1]}`);
        console.log(`📍 Longitude: ${userData.location.coordinates[0]}`);
        console.log(`📱 Phone: ${userData.phoneNumber || 'N/A'}`);
        console.log('═══════════════════════════════════════════');
      }

      toast.success(pendingVerification.type === 'register' ? 'アカウントが正常に作成されました！' : 'ログイン成功！');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || '認証に失敗しました';
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
    toast.success('ログアウトが正常に完了しました');
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
    localStorage.setItem('user', JSON.stringify({ ...user, ...userData }));
  };

  const setUserDirectly = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
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
    setUserDirectly,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};