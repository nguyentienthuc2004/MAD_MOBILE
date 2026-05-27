import { apiAuthRequest, apiRequest, type ApiResponse } from "./api";

export type AppUser = {
  _id: string;
  username: string;
  displayName?: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  phoneNumber?: string;
  email?: string;
  birthday?: string | null;
  isOnline?: boolean;
  followerCount?: number;
  followingCount?: number;
};

export type UpdateProfilePayload = {
  displayName?: string;
  fullName?: string;
  bio?: string;
  phoneNumber?: string;
  birthday?: string | null;
};

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

/**
 * Lay danh sach nguoi dung.
 * @returns Danh sach user
 * @sideEffect Goi API public.
 */
const getUsers = (): Promise<ApiResponse<AppUser[]>> =>
  apiRequest<ApiResponse<AppUser[]>>("/users", {
    method: "GET",
  });

/**
 * Lay thong tin user theo ID.
 * @param userId ID nguoi dung
 * @returns Thong tin user
 * @sideEffect Can token.
 */
const getUserById = (userId: string): Promise<ApiResponse<AppUser>> =>
  apiAuthRequest<ApiResponse<AppUser>>(`/users/${userId}`, {
    method: "GET",
  });

/**
 * Cap nhat ho so nguoi dung.
 * @param data Du lieu cap nhat
 * @returns Ho so sau khi cap nhat
 * @sideEffect Can token.
 */
const updateProfile = (
  data: UpdateProfilePayload
): Promise<ApiResponse<AppUser>> =>
  apiAuthRequest<ApiResponse<AppUser>>("/users/profile", {
    method: "PUT",
    body: data,
  });

/**
 * Upload avatar nguoi dung.
 * @param imageUri Duong dan anh
 * @returns Ho so sau khi cap nhat avatar
 * @sideEffect Can token, upload multipart.
 */
const uploadAvatar = async (
  imageUri: string
): Promise<ApiResponse<AppUser>> => {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "avatar.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("avatar", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  return apiAuthRequest<ApiResponse<AppUser>>("/users/avatar", {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Doi mat khau tai khoan.
 * @param data Thong tin doi mat khau
 * @returns Ket qua
 * @sideEffect Can token.
 */
const changePassword = (
  data: ChangePasswordPayload
): Promise<ApiResponse<null>> =>
  apiAuthRequest<ApiResponse<null>>("/users/change-password", {
    method: "POST",
    body: data,
  });

/**
 * Cac API quan ly nguoi dung.
 */
export const userService = {
  getUsers,
  getUserById,
  updateProfile,
  uploadAvatar,
  changePassword,
};
