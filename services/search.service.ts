import { apiAuthRequest, type ApiResponse } from "./api";

export type SearchUser = {
  _id: string;
  username: string;
  displayName?: string;
  fullName?: string;
  avatarUrl?: string;
  followerCount?: number;
  isFollowing?: boolean;
};

export type SearchPost = {
  _id: string;
  userId: any;
  caption?: string;
  images?: string[];
  hashtags?: string[];
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
};

export type SearchPagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
};

export type TrendingHashtag = {
  hashtag: string;
  count: number;
};

export type GlobalSearchResult = {
  users: SearchUser[];
  posts: SearchPost[];
  hashtags: string[];
};

/**
 * Tim kiem nguoi dung theo tu khoa.
 * @param q Tu khoa
 * @param page Trang hien tai
 * @param limit So luong moi trang
 * @returns Danh sach user va pagination
 * @sideEffect Can token.
 */
const searchUsers = (
  q: string,
  page = 1,
  limit = 20
): Promise<ApiResponse<SearchUser[]> & { pagination: SearchPagination }> =>
  apiAuthRequest<ApiResponse<SearchUser[]> & { pagination: SearchPagination }>(
    `/search/users?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
    { method: "GET" }
  );

/**
 * Tim kiem bai viet theo tu khoa.
 * @param q Tu khoa
 * @param page Trang hien tai
 * @param limit So luong moi trang
 * @param sortBy Kieu sap xep
 * @returns Danh sach post va pagination
 * @sideEffect Can token.
 */
const searchPosts = (
  q: string,
  page = 1,
  limit = 20,
  sortBy = "relevant"
): Promise<ApiResponse<SearchPost[]> & { pagination: SearchPagination }> =>
  apiAuthRequest<ApiResponse<SearchPost[]> & { pagination: SearchPagination }>(
    `/search/posts?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}&sortBy=${sortBy}`,
    { method: "GET" }
  );

/**
 * Tim kiem tong hop (users, posts, hashtags).
 * @param q Tu khoa
 * @param limit Gioi han ket qua
 * @returns Ket qua tong hop
 * @sideEffect Can token.
 */
const globalSearch = (
  q: string,
  limit = 5
): Promise<ApiResponse<GlobalSearchResult>> =>
  apiAuthRequest<ApiResponse<GlobalSearchResult>>(
    `/search/global?q=${encodeURIComponent(q)}&limit=${limit}`,
    { method: "GET" }
  );

/**
 * Lay danh sach hashtag thinh hanh.
 * @param limit Gioi han so luong
 * @returns Danh sach hashtag
 * @sideEffect Can token.
 */
const getTrendingHashtags = (
  limit = 10
): Promise<ApiResponse<TrendingHashtag[]>> =>
  apiAuthRequest<ApiResponse<TrendingHashtag[]>>(
    `/search/trending-hashtags?limit=${limit}`,
    { method: "GET" }
  );

/**
 * Cac API tim kiem.
 */
export const searchService = {
  searchUsers,
  searchPosts,
  globalSearch,
  getTrendingHashtags,
};
