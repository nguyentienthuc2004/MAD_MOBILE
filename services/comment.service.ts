import { apiAuthRequest, type ApiResponse } from "./api";

export type UserRef = {
  _id: string;
  username: string;
  avatar?: string;
};

export type Comment = {
  id: string;
  postId: string;
  userId: UserRef;
  rootCommentId?: string | null;
  parentCommentId?: string | null;
  content: string;
  mentionUserId?: { _id: string; username: string } | null;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  replyCount?: number;
};

export const commentService = {
  getRootComments(postId: string) {
    return apiAuthRequest<ApiResponse<{ total: number; comments: Comment[] }>>(
      `/posts/${postId}/comments`,
      { method: "GET" },
    );
  },

  getReplies(postId: string, commentId: string) {
    // backend returns { data: { total, replies } }
    return apiAuthRequest<ApiResponse<{ total: number; replies: Comment[] }>>(
      `/posts/${postId}/comments/${commentId}/replies`,
      { method: "GET" },
    );
  },

  getCommentById(postId: string, commentId: string) {
    return apiAuthRequest<ApiResponse<{ comment: Comment }>>(
      `/posts/${postId}/comments/${commentId}`,
      { method: "GET" },
    );
  },

  createComment(postId: string, content: string) {
    return apiAuthRequest<ApiResponse<{ comment: Comment }>>(
      `/posts/${postId}/comments`,
      { method: "POST", body: { content } },
    );
  },

  createReply(postId: string, parentCommentId: string, content: string) {
    return apiAuthRequest<ApiResponse<{ comment: Comment }>>(
      `/posts/${postId}/comments/${parentCommentId}/reply`,
      { method: "POST", body: { content } },
    );
  },

  editComment(postId: string, commentId: string, content: string) {
    return apiAuthRequest<ApiResponse<{ comment: Comment }>>(
      `/posts/${postId}/comments/${commentId}`,
      { method: "PUT", body: { content } },
    );
  },

  deleteComment(postId: string, commentId: string) {
    return apiAuthRequest<ApiResponse<{ success: boolean }>>(
      `/posts/${postId}/comments/${commentId}`,
      { method: "DELETE" },
    );
  },
};

export default commentService;
