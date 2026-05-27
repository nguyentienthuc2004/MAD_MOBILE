import { apiAuthRequest, type ApiResponse } from "./api";

type CacheEntry = {
  ts: number;
  data?: ApiResponse<{ liked: boolean }>;
  promise?: Promise<ApiResponse<{ liked: boolean }>>;
};

const LIKE_STATUS_TTL = 5_000; // 5s
const likeStatusCache = new Map<string, CacheEntry>();

/**
 * Tao khoa cache cho trang thai like.
 * @param t Loai doi tuong (post/comment)
 * @param id ID doi tuong
 * @returns Key cache
 */
const makeKey = (t: string, id: string) => `${t}:${id}`;

export const likeService = {
  /**
   * Like bai viet.
   * @param postId ID bai viet
   * @returns Ket qua like va so luong like
   * @sideEffect Can token, cap nhat cache like status.
   */
  async likePost(postId: string) {
    const res = await apiAuthRequest<ApiResponse<{ liked: boolean; likeCount: number }>>(
      `/posts/${postId}/like`,
      { method: "POST" },
    );
    // update cache
    const key = makeKey("post", postId);
    likeStatusCache.set(key, { ts: Date.now(), data: { success: true, data: { liked: !!res.data?.liked } } as any });
    return res;
  },

  /**
   * Like binh luan.
   * @param commentId ID binh luan
   * @returns Ket qua like va so luong like
   * @sideEffect Can token, cap nhat cache like status.
   */
  async likeComment(commentId: string) {
    const res = await apiAuthRequest<ApiResponse<{ liked: boolean; likeCount: number }>>(
      `/comments/${commentId}/like`,
      { method: "POST" },
    );
    // update cache
    const key = makeKey("comment", commentId);
    likeStatusCache.set(key, { ts: Date.now(), data: { success: true, data: { liked: !!res.data?.liked } } as any });
    return res;
  },

  /**
   * Kiem tra trang thai like (co cache TTL).
   * @param targetType Loai doi tuong
   * @param targetId ID doi tuong
   * @returns Trang thai like
   * @sideEffect Can token, luu cache tam thoi.
   */
  checkLikeStatus(targetType: "post" | "comment", targetId: string) {
    const key = makeKey(targetType, targetId);
    const now = Date.now();
    const entry = likeStatusCache.get(key);
    if (entry && now - entry.ts < LIKE_STATUS_TTL) {
      if (entry.data) return Promise.resolve(entry.data);
      if (entry.promise) return entry.promise;
    }

    const p = apiAuthRequest<ApiResponse<{ liked: boolean }>>(
      `/likes/${targetType}/${targetId}/status`,
      { method: "GET" },
    ).then((res) => {
      likeStatusCache.set(key, { ts: Date.now(), data: res });
      return res;
    }).catch((err) => {
      likeStatusCache.delete(key);
      throw err;
    });

    likeStatusCache.set(key, { ts: now, promise: p });
    return p;
  },

  /**
   * Lay danh sach like cua bai viet.
   * @param postId ID bai viet
   * @returns Danh sach like
   * @sideEffect Can token.
   */
  getPostLikes(postId: string) {
    return apiAuthRequest<ApiResponse<{ total: number; likes: any[] }>>(
      `/posts/${postId}/likes`,
      { method: "GET" },
    );
  },

  /**
   * Lay danh sach like cua binh luan.
   * @param commentId ID binh luan
   * @returns Danh sach like
   * @sideEffect Can token.
   */
  getCommentLikes(commentId: string) {
    return apiAuthRequest<ApiResponse<{ total: number; likes: any[] }>>(
      `/comments/${commentId}/likes`,
      { method: "GET" },
    );
  },
};

export default likeService;
