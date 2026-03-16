import { apiAuthRequest, type ApiResponse } from "./api";

export const likeService = {
  likePost(postId: string) {
    return apiAuthRequest<ApiResponse<{ liked: boolean; likeCount: number }>>(
      `/posts/${postId}/like`,
      { method: "POST" },
    );
  },

  likeComment(commentId: string) {
    return apiAuthRequest<ApiResponse<{ liked: boolean; likeCount: number }>>(
      `/comments/${commentId}/like`,
      { method: "POST" },
    );
  },

  checkLikeStatus(targetType: "post" | "comment", targetId: string) {
    return apiAuthRequest<ApiResponse<{ liked: boolean }>>(
      `/likes/${targetType}/${targetId}/status`,
      { method: "GET" },
    );
  },

  getPostLikes(postId: string) {
    return apiAuthRequest<ApiResponse<{ total: number; likes: any[] }>>(
      `/posts/${postId}/likes`,
      { method: "GET" },
    );
  },

  getCommentLikes(commentId: string) {
    return apiAuthRequest<ApiResponse<{ total: number; likes: any[] }>>(
      `/comments/${commentId}/likes`,
      { method: "GET" },
    );
  },
};

export default likeService;
