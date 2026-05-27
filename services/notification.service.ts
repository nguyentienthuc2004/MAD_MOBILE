import { apiAuthRequest, type ApiResponse } from "./api";

/**
 * Lay danh sach thong bao cua nguoi dung.
 * @returns Danh sach thong bao va tong so
 * @sideEffect Can token.
 */
export const fetchNotifications = async () => {
  return apiAuthRequest<ApiResponse<{ notifications: any[]; total: number }>>(
    `/notifications`,
    { method: "GET" },
  );
};

/**
 * Danh dau thong bao da doc.
 * @param id ID thong bao
 * @returns Ket qua cap nhat
 * @sideEffect Can token.
 */
export const markNotificationRead = async (id: string) => {
  return apiAuthRequest(`/notifications/${id}/read`, { method: "PUT" });
};

/**
 * Danh dau thong bao chua doc.
 * @param id ID thong bao
 * @returns Ket qua cap nhat
 * @sideEffect Can token.
 */
export const markNotificationUnread = async (id: string) => {
  return apiAuthRequest(`/notifications/${id}/unread`, { method: "PUT" });
};

/**
 * Danh dau tat ca thong bao da doc.
 * @returns Ket qua cap nhat
 * @sideEffect Can token.
 */
export const markAllRead = async () => {
  return apiAuthRequest(`/notifications/mark-read-all`, { method: "PUT" });
};

/**
 * Tap hop API thong bao.
 */
export default {
  fetchNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllRead,
};
