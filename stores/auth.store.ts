import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { ApiError, configureApiAuth } from "@/services/api";
import {
  authService,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from "@/services/auth.service";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;

  isAuthenticated: boolean;
  isHydrating: boolean;
  hasHydratedOnce: boolean;
  isSubmitting: boolean;
  error: string | null;

  clearError: () => void;
  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refetchMe: () => Promise<void>;
};

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const normalizeErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,

  isAuthenticated: false,
  isHydrating: false,
  hasHydratedOnce: false,
  isSubmitting: false,
  error: null,

  clearError: () => set({ error: null }),

  hydrate: async () => {
    if (get().isHydrating || get().hasHydratedOnce) {
      return;
    }

    set({ isHydrating: true, error: null });
    let hasSession = false;

    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);

      if (!accessToken || !refreshToken) {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        return;
      }

      hasSession = true;
      set({
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });
    } finally {
      set({ isHydrating: false, hasHydratedOnce: true });
    }

    if (hasSession) {
      void get().refetchMe();
    }
  },

  login: async (payload: LoginPayload) => {
    set({ isSubmitting: true, error: null });

    try {
      const result = await authService.login(payload);
      const { user, accessToken, refreshToken } = result.data;

      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      ]);

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });
    } catch (error) {
      set({ error: normalizeErrorMessage(error, "Login failed") });
    } finally {
      set({ isSubmitting: false });
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isSubmitting: true, error: null });

    try {
      const result = await authService.register(payload);
      const { user, accessToken, refreshToken } = result.data;

      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      ]);

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });
    } catch (error) {
      set({ error: normalizeErrorMessage(error, "Đăng ký thất bại") });
    } finally {
      set({ isSubmitting: false });
    }
  },

  refetchMe: async () => {
    const { accessToken } = get();

    if (!accessToken) {
      return;
    }

    try {
      const meResult = await authService.me();
      set({ user: meResult.data, isAuthenticated: true, error: null });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearLocalSession();
      }
    }
  },

  logout: async () => {
    const { accessToken, refreshToken, isAuthenticated } = get();

    if (isAuthenticated && accessToken) {
      try {
        await authService.logout(refreshToken ?? undefined);
      } catch {}
    }

    await clearLocalSession();
  },

  logoutAll: async () => {
    const { accessToken, isAuthenticated } = get();

    if (isAuthenticated && accessToken) {
      try {
        await authService.logoutAll();
      } catch {}
    }

    await clearLocalSession();
  },
}));

const clearLocalSession = async (message: string | null = null) => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);

  useAuth.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    error: message ?? null,
  });
};

configureApiAuth({
  getAccessToken: () => useAuth.getState().accessToken,
  refreshAccessToken: async () => {
    const currentRefreshToken = useAuth.getState().refreshToken;

    if (!currentRefreshToken) {
      return null;
    }

    try {
      const refreshResult = await authService.refresh(currentRefreshToken);
      const { accessToken, refreshToken } = refreshResult.data;

      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      ]);

      useAuth.setState({
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });

      return accessToken;
    } catch {
      return null;
    }
  },
  onAuthFailure: async () => {
    await clearLocalSession(
      "Bạn đã hết phiên đăng nhập. Vui lòng đăng nhập lại.",
    );
  },
});
