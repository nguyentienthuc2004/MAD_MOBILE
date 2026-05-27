import { apiAuthRequest } from "./api";
import { AppUser } from "./user.service";

export const followService = {
  /**
   * Kiem tra trang thai follow.
   * @param userId ID nguoi can kiem tra
   * @returns { isFollowing }
   * @sideEffect Can token.
   */
  async checkFollowStatus(userId: string) {
    return apiAuthRequest<{ isFollowing: boolean }>(`/api/follow/${userId}/status`, {
      method: "GET",
    });
  },
  /**
   * Lay danh sach followers cua user.
   * @param userId ID nguoi dung
   * @returns Danh sach followers
   * @sideEffect Can token.
   */
  async getFollowers(userId: string) {
    return apiAuthRequest<{ success: boolean; data: AppUser[] }>(`/users/${userId}/followers`, {
      method: "GET",
    });
  },
  /**
   * Lay danh sach following cua user.
   * @param userId ID nguoi dung
   * @returns Danh sach following
   * @sideEffect Can token.
   */
  async getFollowing(userId: string) {
    return apiAuthRequest<{ success: boolean; data: AppUser[] }>(`/users/${userId}/following`, {
      method: "GET",
    });
  },
  /**
   * Follow nguoi dung.
   * @param userId ID nguoi can follow
   * @returns Ket qua follow
   * @sideEffect Can token.
   */
  async followUser(userId: string) {
    return apiAuthRequest<{ success: boolean; message?: string }>(`/follow/${userId}`, {
      method: "POST",
    });
  },
  /**
   * Unfollow nguoi dung.
   * @param userId ID nguoi can unfollow
   * @returns Ket qua unfollow
   * @sideEffect Can token.
   */
  async unfollowUser(userId: string) {
    return apiAuthRequest<{ success: boolean; message?: string }>(`/follow/${userId}`, {
      method: "DELETE",
    });
  },
};
