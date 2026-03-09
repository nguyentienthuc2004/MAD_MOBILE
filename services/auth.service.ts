import { apiAuthRequest, apiRequest } from "./api";

export type AuthUser = {
  _id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  displayName?: string;
  avatar?: string;
  status?: string;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  code?: string;
  data: T;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export const authService = {
  register(payload: RegisterPayload) {
    return apiRequest<ApiEnvelope<AuthSession>>("/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  login(payload: LoginPayload) {
    return apiRequest<ApiEnvelope<AuthSession>>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  refresh(refreshToken: string) {
    return apiRequest<ApiEnvelope<AuthTokens>>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },

  logout(refreshToken?: string) {
    return apiAuthRequest<ApiEnvelope<{ message?: string }>>("/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
    });
  },

  logoutAll() {
    return apiAuthRequest<ApiEnvelope<{ message?: string }>>(
      "/auth/logout-all",
      {
        method: "POST",
      },
    );
  },

  me() {
    return apiAuthRequest<ApiEnvelope<AuthUser>>("/auth/me", {
      method: "GET",
    });
  },
};
