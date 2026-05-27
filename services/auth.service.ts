import { apiAuthRequest, apiRequest, ApiResponse } from "./api";

export type AuthUser = {
  _id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  displayName?: string;
  fullName?: string;
  avatarUrl?: string;
  status?: string;
  isDeleted?: boolean;
  bio?: string;
  birthday?: string | null;
  isOnline?: boolean;
  lastOnlineAt?: string;
  followerCount?: number;
  followingCount?: number;
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

/**
 * Cac API xac thuc nguoi dung.
 */
export const authService = {
  /**
   * Dang ky tai khoan moi.
   * @param payload Thong tin dang ky
   * @returns Session (user + tokens)
   * @sideEffect Goi API public, khong can token.
   */
  register(payload: RegisterPayload) {
    return apiRequest<ApiResponse<AuthSession>>("/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Dang nhap va nhan session.
   * @param payload Thong tin dang nhap
   * @returns Session (user + tokens)
   * @sideEffect Goi API public, khong can token.
   */
  login(payload: LoginPayload) {
    return apiRequest<ApiResponse<AuthSession>>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Lam moi access token bang refresh token.
   * @param refreshToken Refresh token hien tai
   * @returns Cap token moi
   * @sideEffect Goi API public, khong can access token.
   */
  refresh(refreshToken: string) {
    return apiRequest<ApiResponse<AuthTokens>>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },

  /**
   * Dang xuat thiet bi hien tai.
   * @param refreshToken Refresh token neu can
   * @returns Thong diep tu server
   * @sideEffect Goi API co token, co the bo qua refresh.
   */
  logout(refreshToken?: string) {
    return apiAuthRequest<ApiResponse<{ message?: string }>>("/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
      skipAuthRefresh: true,
    });
  },

  /**
   * Dang xuat tat ca thiet bi.
   * @returns Thong diep tu server
   * @sideEffect Goi API co token, co the bo qua refresh.
   */
  logoutAll() {
    return apiAuthRequest<ApiResponse<{ message?: string }>>(
      "/auth/logout-all",
      {
        method: "POST",
        skipAuthRefresh: true,
      },
    );
  },

  /**
   * Lay thong tin nguoi dung hien tai.
   * @returns Thong tin user
   * @sideEffect Can token.
   */
  me() {
    return apiAuthRequest<ApiResponse<AuthUser>>("/auth/me", {
      method: "GET",
    });
  },

  /**
   * Gui email khoi phuc mat khau.
   * @param payload Email can gui OTP
   * @returns Ket qua gui OTP
   * @sideEffect Goi API public.
   */
  forgotPassword(payload: { email: string }) {
    return apiRequest<ApiResponse<null>>("/auth/forgot-password", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Xac thuc OTP de lay reset token.
   * @param payload Email va OTP
   * @returns Reset token neu hop le
   * @sideEffect Goi API public.
   */
  verifyOtp(payload: { email: string; otp: string }) {
    return apiRequest<ApiResponse<{ resetToken?: string }>>(
      "/auth/verify-otp",
      {
        method: "POST",
        body: payload,
      },
    );
  },

  /**
   * Dat lai mat khau bang reset token.
   * @param payload Thong tin dat lai mat khau
   * @returns Thong diep tu server
   * @sideEffect Goi API public.
   */
  resetPassword(payload: {
    resetToken: string;
    newPassword: string;
    logoutOtherDevices?: boolean;
  }) {
    return apiRequest<ApiResponse<{ message?: string }>>(
      "/auth/reset-password",
      {
        method: "POST",
        body: payload,
      },
    );
  },
};
