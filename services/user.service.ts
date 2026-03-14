import { apiAuthRequest, apiRequest, type ApiResponse } from "./api";

export type AppUser = {
  _id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phoneNumber?: string;
  email?: string;
  isOnline?: boolean;
};

const getUsers = (): Promise<ApiResponse<AppUser[]>> =>
  apiRequest<ApiResponse<AppUser[]>>("/users", {
    method: "GET",
  });
const getUserById = (userId: string): Promise<ApiResponse<AppUser>> =>
  apiAuthRequest<ApiResponse<AppUser>>(`/users/${userId}`, {
    method: "GET",
  });
export const userService = {
  getUsers,
  getUserById,
};
