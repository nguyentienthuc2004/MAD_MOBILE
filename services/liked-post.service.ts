import { apiAuthRequest, type ApiResponse } from "./api";
import { Post } from "./post.service";

export const likedPostService = {
    async getLikedPostsByUser(userId: string): Promise<ApiResponse<Post[]>> {
        return apiAuthRequest<ApiResponse<Post[]>>(`/posts/likedByUser/${userId}`, {
            method: "GET",
        });
    },
};

export default likedPostService;
