import { apiRequest, type ApiResponse } from "./api";

export interface Post {
  _id: string;
  userId: string;
  caption: string;
  hashtags: string[];
  images: string[];
  musicId?: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export const getPostsByUserId = (userId: string): Promise<ApiResponse<Post[]>> =>
  apiRequest<ApiResponse<Post[]>>(`/posts/byUser/${userId}`, {
    method: "GET",
  });

export const postService = {
  getPostsByUserId,
};