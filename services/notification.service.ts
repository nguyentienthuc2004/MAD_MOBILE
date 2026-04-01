import { apiAuthRequest, type ApiResponse } from "./api";

export const fetchNotifications = async () => {
  return apiAuthRequest<ApiResponse<{ notifications: any[]; total: number }>>(
    `/notifications`,
    { method: "GET" },
  );
};

export const markNotificationRead = async (id: string) => {
  return apiAuthRequest(`/notifications/${id}/read`, { method: "PUT" });
};

export const markNotificationUnread = async (id: string) => {
  return apiAuthRequest(`/notifications/${id}/unread`, { method: "PUT" });
};

export const markAllRead = async () => {
  return apiAuthRequest(`/notifications/mark-read-all`, { method: "PUT" });
};

export default {
  fetchNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllRead,
};
