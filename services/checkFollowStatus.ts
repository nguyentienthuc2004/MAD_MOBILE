import { apiAuthRequest } from "./api";

/**
 * Kiem tra trang thai follow cua nguoi dung hien tai doi voi target.
 * @param targetUserId ID nguoi can kiem tra
 * @returns { isFollowing }
 * @sideEffect Can token.
 */
export const checkFollowStatus = async (targetUserId: string) => {
    return apiAuthRequest<{ isFollowing: boolean }>(`/follow/${targetUserId}/status`, {
        method: "GET",
    });
};
