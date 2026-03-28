import { apiAuthRequest } from "./api";

export const checkFollowStatus = async (targetUserId: string) => {
    return apiAuthRequest<{ isFollowing: boolean }>(`/follow/${targetUserId}/status`, {
        method: "GET",
    });
};
