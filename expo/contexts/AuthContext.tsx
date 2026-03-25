import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import createContextHook from '@nkzw/create-context-hook';
import api, { setToken, setRefreshToken, clearTokens } from '@/utils/api-client';
import { MemberProfile, AuthTokens } from '@/types';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<MemberProfile | null>(null);
  const queryClient = useQueryClient();

  const checkAuth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        const response = await api.get('/api/auth/me');
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await api.post('/api/auth/login', { email, password });
      return response.data as AuthTokens;
    },
    onSuccess: async (data) => {
      console.log('Login response keys:', Object.keys(data));
      await setToken(data.access_token);
      if (data.refresh_token) {
        await setRefreshToken(data.refresh_token);
      }
      await SecureStore.setItemAsync('member_id', String(data.member_id));
      await SecureStore.setItemAsync('member_name', data.name ?? '');
      await SecureStore.setItemAsync('is_board_member', String(data.is_board_member ?? false));
      await SecureStore.setItemAsync('is_admin', String(data.is_admin ?? false));
      const meResponse = await api.get('/api/auth/me');
      setUser(meResponse.data);
      setIsAuthenticated(true);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      phone?: string;
    }) => {
      const response = await api.post('/api/auth/register', data);
      return response.data as AuthTokens;
    },
    onSuccess: async (data) => {
      console.log('Register response keys:', Object.keys(data));
      await setToken(data.access_token);
      if (data.refresh_token) {
        await setRefreshToken(data.refresh_token);
      }
      await SecureStore.setItemAsync('member_id', String(data.member_id));
      await SecureStore.setItemAsync('member_name', data.name ?? '');
      await SecureStore.setItemAsync('is_board_member', String(data.is_board_member ?? false));
      await SecureStore.setItemAsync('is_admin', String(data.is_admin ?? false));
      const meResponse = await api.get('/api/auth/me');
      setUser(meResponse.data);
      setIsAuthenticated(true);
    },
  });

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    queryClient.clear();
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.log('Profile refresh failed:', error);
    }
  }, []);

  return useMemo(() => ({
    isAuthenticated,
    isLoading,
    isLoadingProfile: isLoading,
    user,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error,
    isRegistering: registerMutation.isPending,
    logout,
    refreshProfile,
  }), [
    isAuthenticated,
    isLoading,
    user,
    loginMutation.mutateAsync,
    loginMutation.error,
    loginMutation.isPending,
    registerMutation.mutateAsync,
    registerMutation.error,
    registerMutation.isPending,
    logout,
    refreshProfile,
  ]);
});
