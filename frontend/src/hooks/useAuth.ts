import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

const TOKEN_KEY = 'openbook_admin_token';

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await apiClient.post<{ access_token: string }>('/api/auth/login', {
      email,
      password,
    });
    const t = res.data.access_token;
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const isAuthenticated = Boolean(token);

  return { token, login, logout, isAuthenticated };
}
