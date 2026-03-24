import { apiAuthRequest, apiRequest, ApiResponse } from "./api";

export type AuthUser = {
  _id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
  isDeleted?: boolean;
  bio?: string;
  isOnline?: boolean;
  lastOnlineAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

// type ApiEnvelope<T> = {
//   success: boolean;
//   message?: string;
//   code?: string;
//   data: T;
// };

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
    return apiRequest<ApiResponse<AuthSession>>("/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  login(payload: LoginPayload) {
    return apiRequest<ApiResponse<AuthSession>>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  refresh(refreshToken: string) {
    return apiRequest<ApiResponse<AuthTokens>>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },

  logout(refreshToken?: string) {
    return apiAuthRequest<ApiResponse<{ message?: string }>>("/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
    });
  },

  logoutAll() {
    return apiAuthRequest<ApiResponse<{ message?: string }>>(
      "/auth/logout-all",
      {
        method: "POST",
      },
    );
  },

  me() {
    return apiAuthRequest<ApiResponse<AuthUser>>("/auth/me", {
      method: "GET",
    });
  },

  forgotPassword(payload: { email: string }) {
    return apiRequest<ApiResponse<null>>("/auth/forgot-password", {
      method: "POST",
      body: payload,
    });
  },

  verifyOtp(payload: { email: string; otp: string }) {
    return apiRequest<ApiResponse<{ resetToken?: string }>>(
      "/auth/verify-otp",
      {
        method: "POST",
        body: payload,
      },
    );
  },

  resetPassword(payload: { resetToken: string; newPassword: string }) {
    return apiRequest<ApiResponse<{ message?: string }>>(
      "/auth/reset-password",
      {
        method: "POST",
        body: payload,
      },
    );
  },
};
