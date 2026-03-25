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
      console.log('[Auth] Attempting login...');
      const response = await api.post('/api/auth/login', { email, password });
      console.log('[Auth] Login response status:', response.status);
      console.log('[Auth] Login response keys:', Object.keys(response.data ?? {}));
      console.log('[Auth] Has access_token:', !!response.data?.access_token);
      console.log('[Auth] Has refresh_token:', !!response.data?.refresh_token);
      const data = response.data;
      if (!data?.access_token) {
        throw new Error('Login succeeded but no access token received');
      }
      return data as AuthTokens;
    },
    onSuccess: async (data) => {
      try {
        console.log('[Auth] Storing tokens...');
        await setToken(data.access_token);
        if (data.refresh_token) {
          await setRefreshToken(data.refresh_token);
        } else {
          console.log('[Auth] Warning: No refresh_token in login response');
        }
        if (data.member_id != null) {
          await SecureStore.setItemAsync('member_id', String(data.member_id));
        }
        await SecureStore.setItemAsync('member_name', data.name ?? '');
        await SecureStore.setItemAsync('is_board_member', String(data.is_board_member ?? false));
        await SecureStore.setItemAsync('is_admin', String(data.is_admin ?? false));
        console.log('[Auth] Fetching user profile...');
        const meResponse = await api.get('/api/auth/me');
        console.log('[Auth] Profile fetched successfully');
        setUser(meResponse.data);
        setIsAuthenticated(true);
      } catch (err) {
        console.log('[Auth] Error in login onSuccess:', err);
        throw err;
      }
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
      console.log('[Auth] Attempting registration...');
      const response = await api.post('/api/auth/register', data);
      console.log('[Auth] Register response keys:', Object.keys(response.data ?? {}));
      const resData = response.data;
      if (!resData?.access_token) {
        throw new Error('Registration succeeded but no access token received');
      }
      return resData as AuthTokens;
    },
    onSuccess: async (data) => {
      try {
        console.log('[Auth] Storing tokens after registration...');
        await setToken(data.access_token);
        if (data.refresh_token) {
          await setRefreshToken(data.refresh_token);
        }
        if (data.member_id != null) {
          await SecureStore.setItemAsync('member_id', String(data.member_id));
        }
        await SecureStore.setItemAsync('member_name', data.name ?? '');
        await SecureStore.setItemAsync('is_board_member', String(data.is_board_member ?? false));
        await SecureStore.setItemAsync('is_admin', String(data.is_admin ?? false));
        const meResponse = await api.get('/api/auth/me');
        setUser(meResponse.data);
        setIsAuthenticated(true);
      } catch (err) {
        console.log('[Auth] Error in register onSuccess:', err);
        throw err;
      }
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
