import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from "axios";
import { Platform } from "react-native";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: RawAxiosRequestHeaders;
  body?: unknown;
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
};

type ApiAuthConfig = {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  onAuthFailure?: () => Promise<void> | void;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  skipAuthRefresh?: boolean;
  _retry?: boolean;
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  code?: string;
  data: T;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let apiAuthConfig: ApiAuthConfig | null = null;
let refreshPromise: Promise<string | null> | null = null;

//store dang ky cach lay token va xu ly mat phien
export const configureApiAuth = (config: ApiAuthConfig) => {
  apiAuthConfig = config;
};

const DEFAULT_API_URL = Platform.select({
  android: "http://10.0.2.2:3000/api",
  default: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api",
});

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.API_BASE_URL ?? "";

//xoa dau / cuoi base url
const normalizeApiBaseUrl = (url: string) => url.trim().replace(/\/+$/, "");

//doi localhost thanh 10.0.2.2 tren android emulator
const resolveApiBaseUrl = () => {
  let base = configuredApiUrl.trim() || DEFAULT_API_URL;

  if (Platform.OS === "android") {
    base = base
      .replace("localhost", "10.0.2.2")
      .replace("127.0.0.1", "10.0.2.2");
  }

  return normalizeApiBaseUrl(base);
};

export const API_BASE_URL = resolveApiBaseUrl();

const buildUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
console.log("API_BASE_URL =", API_BASE_URL);
//tao axios client mac dinh
const createClient = (): AxiosInstance =>
  axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

const publicClient = createClient();
const authClient = createClient();

//chuan hoa loi ve apierror de ui xu ly dong nhat
const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return new ApiError(error.message, 0);
    }
    return new ApiError("Unknown network error", 0);
  }

  const axiosError = error as AxiosError<{ message?: string; code?: string }>;
  const status = axiosError.response?.status ?? 0;
  const data = axiosError.response?.data;
  const backendMessage = data?.message;
  const code = data?.code;

  if (status === 0 || axiosError.code === "ERR_NETWORK") {
    return new ApiError(
      `Không kết nối được API (${API_BASE_URL}). Kiểm tra EXPO_PUBLIC_API_URL trong .env.`,
      0,
      code,
      data,
    );
  }

  if (axiosError.code === "ECONNABORTED") {
    return new ApiError("Request timeout", 408, code, data);
  }

  return new ApiError(
    backendMessage ??
      axiosError.message ??
      `Request failed with status ${status}`,
    status,
    code,
    data,
  );
};

//gan access token vao request can auth
authClient.interceptors.request.use((config) => {
  const accessToken = apiAuthConfig?.getAccessToken();
  if (accessToken) {
    const headers = AxiosHeaders.from(config.headers ?? {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    config.headers = headers;
  }

  return config;
});

//bat 401 refresh token 1 lan roi gui lai request cu
authClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(toApiError(error));
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (
      !originalRequest ||
      status !== 401 ||
      originalRequest._retry ||
      originalRequest.skipAuthRefresh ||
      !apiAuthConfig
    ) {
      return Promise.reject(toApiError(error));
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      console.log("[api] refresh start");
      refreshPromise = apiAuthConfig
        .refreshAccessToken()
        .catch(() => null)
        .finally(() => {
          refreshPromise = null;
        });
    }

    const nextAccessToken = await refreshPromise;

    if (!nextAccessToken) {
      console.log("[api] refresh fail");
      await apiAuthConfig.onAuthFailure?.();
      return Promise.reject(toApiError(error));
    }

    console.log("[api] refresh ok retry");

    const headers = AxiosHeaders.from(originalRequest.headers ?? {});
    headers.set("Authorization", `Bearer ${nextAccessToken}`);
    originalRequest.headers = headers;

    return authClient.request(originalRequest);
  },
);

//ham request dung chung cho public va auth client
const requestWithClient = async <T>(
  client: AxiosInstance,
  path: string,
  options: ApiRequestOptions,
): Promise<T> => {
  const { body, timeoutMs = 15000, headers, ...rest } = options;
  const method = String(rest.method ?? "GET").toUpperCase();
  const url = buildUrl(path);
  const startedAt = Date.now();
  console.log(`[api] -> ${method} ${url}`);

  try {
    const response = await client.request<T>({
      ...rest,
      url,
      timeout: timeoutMs,
      data: body,
      headers: {
        ...(headers ?? {}),
      },
    });

    console.log(
      `[api] <- ${response.status} ${method} ${url} (${Date.now() - startedAt}ms)`,
    );

    return response.data;
  } catch (error) {
    const apiError = toApiError(error);
    console.log(
      `[api] !! ${apiError.status} ${method} ${url} (${Date.now() - startedAt}ms)`,
    );
    throw apiError;
  }
};

//request cho api public
export const apiRequest = <T>(path: string, options: ApiRequestOptions = {}) =>
  requestWithClient<T>(publicClient, path, options);

//request cho api can token
export const apiAuthRequest = <T>(
  path: string,
  options: ApiRequestOptions = {},
) => requestWithClient<T>(authClient, path, options);
