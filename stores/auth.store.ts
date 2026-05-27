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
let isManualLogoutInProgress = false;

/**
 * Chuan hoa thong diep loi de hien thi UI.
 * @param error Loi bat duoc
 * @param fallback Thong diep mac dinh
 * @returns Thong diep loi da chuan hoa
 */
const normalizeErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

/**
 * Store xac thuc toan cuc (user, token, trang thai va actions).
 */
export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,

  isAuthenticated: false,
  isHydrating: false,
  hasHydratedOnce: false,
  isSubmitting: false,
  error: null,

  /**
   * Xoa thong bao loi hien tai.
   * @returns void
   */
  clearError: () => set({ error: null }),

  /**
   * Khoi phuc phien dang nhap tu SecureStore.
   * @returns void
   * @sideEffect Doc SecureStore va co the goi refetchMe.
   */
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

  /**
   * Dang nhap va luu token.
   * @param payload Thong tin dang nhap
   * @returns void
   * @sideEffect Goi API, ghi SecureStore, cap nhat state.
   */
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

  /**
   * Dang ky va luu token.
   * @param payload Thong tin dang ky
   * @returns void
   * @sideEffect Goi API, ghi SecureStore, cap nhat state.
   */
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

  /**
   * Lay lai thong tin user tu backend.
   * @returns void
   * @sideEffect Goi API, co the xoa phien neu 401.
   */
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

  /**
   * Dang xuat thiet bi hien tai.
   * @returns void
   * @sideEffect Goi API, xoa SecureStore, reset state.
   */
  logout: async () => {
    if (isManualLogoutInProgress) {
      return;
    }

    isManualLogoutInProgress = true;
    const { accessToken, refreshToken, isAuthenticated } = get();

    try {
      if (isAuthenticated && accessToken) {
        try {
          await authService.logout(refreshToken ?? undefined);
        } catch {}
      }
    } finally {
      await clearLocalSession();
      isManualLogoutInProgress = false;
    }
  },

  /**
   * Dang xuat tat ca thiet bi.
   * @returns void
   * @sideEffect Goi API, xoa SecureStore, reset state.
   */
  logoutAll: async () => {
    if (isManualLogoutInProgress) {
      return;
    }

    isManualLogoutInProgress = true;
    const { accessToken, isAuthenticated } = get();

    try {
      if (isAuthenticated && accessToken) {
        try {
          await authService.logoutAll();
        } catch {}
      }
    } finally {
      await clearLocalSession("Bạn đã đăng xuất ra khỏi tất cả thiết bị.");
      isManualLogoutInProgress = false;
    }
  },
}));

/**
 * Xoa session local va reset state auth.
 * @param message Thong diep loi neu can
 * @returns void
 * @sideEffect Xoa SecureStore va cap nhat store.
 */
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

/**
 * Dang ky co che refresh token va xu ly mat phien.
 * @sideEffect Tu dong refresh token khi gap 401.
 */
configureApiAuth({
  /**
   * Cung cap access token hien tai cho interceptor.
   * @returns Access token hoac null
   */
  getAccessToken: () => useAuth.getState().accessToken,
  /**
   * Thuc hien refresh token khi gap 401.
   * @returns Access token moi hoac null neu that bai
   * @sideEffect Goi API va cap nhat SecureStore.
   */
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
  /**
   * Xu ly khi refresh that bai hoac mat phien.
   * @returns void
   * @sideEffect Xoa session local va cap nhat error.
   */
  onAuthFailure: async () => {
    const { isAuthenticated, accessToken, refreshToken } = useAuth.getState();

    if (
      isManualLogoutInProgress ||
      (!isAuthenticated && !accessToken && !refreshToken)
    ) {
      await clearLocalSession();
      return;
    }

    await clearLocalSession(
      "Bạn đã hết phiên đăng nhập. Vui lòng đăng nhập lại.",
    );
  },
});
