import { apiAuthRequest } from "./api";
import { AppUser } from "./user.service";

export const followService = {
  async checkFollowStatus(userId: string) {
    return apiAuthRequest<{ isFollowing: boolean }>(`/api/follow/${userId}/status`, {
      method: "GET",
    });
  },
  async getFollowers(userId: string) {
    return apiAuthRequest<{ success: boolean; data: AppUser[] }>(`/users/${userId}/followers`, {
      method: "GET",
    });
  },
  async getFollowing(userId: string) {
    return apiAuthRequest<{ success: boolean; data: AppUser[] }>(`/users/${userId}/following`, {
      method: "GET",
    });
  },
  async followUser(userId: string) {
    return apiAuthRequest<{ success: boolean; message?: string }>(`/follow/${userId}`, {
      method: "POST",
    });
  },
  async unfollowUser(userId: string) {
    return apiAuthRequest<{ success: boolean; message?: string }>(`/follow/${userId}`, {
      method: "DELETE",
    });
  },
};
