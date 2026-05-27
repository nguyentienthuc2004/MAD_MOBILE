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

/**
 * Cac API quan ly binh luan.
 */
export const commentService = {
  /**
   * Lay danh sach binh luan goc cua bai viet.
   * @param postId ID bai viet
   * @returns Danh sach binh luan goc
   * @sideEffect Can token.
   */
  getRootComments(postId: string) {
    return apiAuthRequest<ApiResponse<{ total: number; comments: Comment[] }>>(
      `/posts/${postId}/comments`,
      { method: "GET" },
    );
  },

  /**
   * Lay danh sach reply cua mot binh luan.
   * @param postId ID bai viet
   * @param commentId ID binh luan cha
   * @returns Danh sach reply
   * @sideEffect Can token.
   */
  getReplies(postId: string, commentId: string) {
    // backend returns { data: { total, replies } }
    return apiAuthRequest<ApiResponse<{ total: number; replies: Comment[] }>>(
      `/posts/${postId}/comments/${commentId}/replies`,
      { method: "GET" },
    );
  },

  /**
   * Lay chi tiet binh luan theo ID.
   * @param postId ID bai viet
   * @param commentId ID binh luan
   * @returns Thong tin binh luan
   * @sideEffect Can token.
   */
  getCommentById(postId: string, commentId: string) {
    return apiAuthRequest<ApiResponse<{ comment: Comment }>>(
      `/posts/${postId}/comments/${commentId}`,
      { method: "GET" },
    );
  },

  /**
   * Tao binh luan moi.
   * @param postId ID bai viet
   * @param content Noi dung
   * @returns Binh luan vua tao
   * @sideEffect Can token.
   */
  createComment(postId: string, content: string) {
    return apiAuthRequest<ApiResponse<{ comment: Comment }>>(
      `/posts/${postId}/comments`,
      { method: "POST", body: { content } },
    );
  },

  /**
   * Tao reply cho binh luan.
   * @param postId ID bai viet
   * @param parentCommentId ID binh luan cha
   * @param content Noi dung
   * @returns Binh luan vua tao
   * @sideEffect Can token.
   */
  createReply(postId: string, parentCommentId: string, content: string) {
    return apiAuthRequest<ApiResponse<{ comment: Comment }>>(
      `/posts/${postId}/comments/${parentCommentId}/reply`,
      { method: "POST", body: { content } },
    );
  },

  /**
   * Chinh sua binh luan.
   * @param postId ID bai viet
   * @param commentId ID binh luan
   * @param content Noi dung moi
   * @returns Binh luan sau khi sua
   * @sideEffect Can token.
   */
  editComment(postId: string, commentId: string, content: string) {
    return apiAuthRequest<ApiResponse<{ comment: Comment }>>(
      `/posts/${postId}/comments/${commentId}`,
      { method: "PUT", body: { content } },
    );
  },

  /**
   * Xoa binh luan.
   * @param postId ID bai viet
   * @param commentId ID binh luan
   * @returns Ket qua xoa
   * @sideEffect Can token.
   */
  deleteComment(postId: string, commentId: string) {
    return apiAuthRequest<ApiResponse<{ success: boolean }>>(
      `/posts/${postId}/comments/${commentId}`,
      { method: "DELETE" },
    );
  },
};

export default commentService;
