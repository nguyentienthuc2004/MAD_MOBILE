import { apiAuthRequest, type ApiResponse } from "./api";
import { Post } from "./post.service";

export const likedPostService = {
    /**
     * Lay danh sach bai viet da like cua user.
     * @param userId ID nguoi dung
     * @returns Danh sach post da like
     * @sideEffect Can token.
     */
    async getLikedPostsByUser(userId: string): Promise<ApiResponse<Post[]>> {
        return apiAuthRequest<ApiResponse<Post[]>>(`/posts/likedByUser/${userId}`, {
            method: "GET",
        });
    },
};

export default likedPostService;
