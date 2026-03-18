import { apiAuthRequest, type ApiResponse } from "./api";

type CacheEntry = {
  ts: number;
  data?: ApiResponse<{ liked: boolean }>;
  promise?: Promise<ApiResponse<{ liked: boolean }>>;
};

const LIKE_STATUS_TTL = 5_000; // 5s
const likeStatusCache = new Map<string, CacheEntry>();

const makeKey = (t: string, id: string) => `${t}:${id}`;

export const likeService = {
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
