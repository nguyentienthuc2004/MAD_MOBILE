import { apiAuthRequest, type ApiResponse } from "./api";

export const fetchNotifications = async (
  opts: { page?: number; limit?: number } = {},
) => {
  const { page = 1, limit = 20 } = opts;
  return apiAuthRequest<ApiResponse<{ notifications: any[]; total: number }>>(
    `/notifications?page=${page}&limit=${limit}`,
    { method: "GET" },
  );
};

export const markNotificationRead = async (id: string) => {
  return apiAuthRequest(`/notifications/${id}/read`, { method: "PUT" });
};

export const markAllRead = async () => {
  return apiAuthRequest(`/notifications/mark-read-all`, { method: "PUT" });
};

export default {
  fetchNotifications,
  markNotificationRead,
  markAllRead,
};
