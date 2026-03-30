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

const searchUsers = (
  q: string,
  page = 1,
  limit = 20
): Promise<ApiResponse<SearchUser[]> & { pagination: SearchPagination }> =>
  apiAuthRequest<ApiResponse<SearchUser[]> & { pagination: SearchPagination }>(
    `/search/users?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
    { method: "GET" }
  );

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

const globalSearch = (
  q: string,
  limit = 5
): Promise<ApiResponse<GlobalSearchResult>> =>
  apiAuthRequest<ApiResponse<GlobalSearchResult>>(
    `/search/global?q=${encodeURIComponent(q)}&limit=${limit}`,
    { method: "GET" }
  );

const getTrendingHashtags = (
  limit = 10
): Promise<ApiResponse<TrendingHashtag[]>> =>
  apiAuthRequest<ApiResponse<TrendingHashtag[]>>(
    `/search/trending-hashtags?limit=${limit}`,
    { method: "GET" }
  );

export const searchService = {
  searchUsers,
  searchPosts,
  globalSearch,
  getTrendingHashtags,
};
