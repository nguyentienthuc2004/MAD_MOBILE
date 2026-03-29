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

const getUsers = (): Promise<ApiResponse<AppUser[]>> =>
  apiRequest<ApiResponse<AppUser[]>>("/users", {
    method: "GET",
  });

const getUserById = (userId: string): Promise<ApiResponse<AppUser>> =>
  apiAuthRequest<ApiResponse<AppUser>>(`/users/${userId}`, {
    method: "GET",
  });

const updateProfile = (
  data: UpdateProfilePayload
): Promise<ApiResponse<AppUser>> =>
  apiAuthRequest<ApiResponse<AppUser>>("/users/profile", {
    method: "PUT",
    body: data,
  });

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

const changePassword = (
  data: ChangePasswordPayload
): Promise<ApiResponse<null>> =>
  apiAuthRequest<ApiResponse<null>>("/users/change-password", {
    method: "POST",
    body: data,
  });

export const userService = {
  getUsers,
  getUserById,
  updateProfile,
  uploadAvatar,
  changePassword,
};
