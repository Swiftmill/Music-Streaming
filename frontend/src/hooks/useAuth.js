import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('aurora-token'));

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/profile');
        setUser(data);
      } catch (error) {
        console.error('Failed to load profile', error);
        localStorage.removeItem('aurora-token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      loading,
      token,
      async login(credentials) {
        const { data } = await api.post('/auth/login', credentials);
        localStorage.setItem('aurora-token', data.token);
        setToken(data.token);
        setUser({ ...data.user });
      },
      logout() {
        localStorage.removeItem('aurora-token');
        setToken(null);
        setUser(null);
      },
      refreshProfile: async () => {
        const { data } = await api.get('/auth/profile');
        setUser(data);
      }
    }),
    [user, loading, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
