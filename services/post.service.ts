import { apiAuthRequest, type ApiResponse } from "./api";

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
  isSensitive: boolean;
}

export interface FeedPostsResponse extends ApiResponse<Post[]> {
  viewedAllPosts?: boolean;
}
export interface PostRequest {
  caption: string;
  hashtags: string[];
  images: string[];
  musicId?: string | null;
}

export interface EditPostRequest {
  caption: string;
  hashtags: string[];
  existingImages: string[];
  musicId?: string | null;
}

/**
 * Suy doan mime type tu duong dan anh.
 * @param uri Duong dan anh
 * @returns Mime type
 */
const inferMimeType = (uri: string) => {
  const normalized = uri.toLowerCase().split("?")[0];

  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".heic")) return "image/heic";
  if (normalized.endsWith(".webp")) return "image/webp";

  return "image/jpeg";
};

/**
 * Tao ten file tu uri hoac fallback theo thu tu.
 * @param uri Duong dan anh
 * @param index Thu tu anh
 * @param mimeType Mime type
 * @returns Ten file phu hop
 */
const inferFileName = (uri: string, index: number, mimeType: string) => {
  const normalized = uri.split("?")[0];
  const fromUri = normalized.split("/").pop();

  if (fromUri && fromUri.includes(".")) {
    return fromUri;
  }

  const extension = mimeType.split("/")[1] || "jpg";
  return `post-image-${index}.${extension}`;
};

/**
 * Tao FormData cho request tao bai viet.
 * @param data Du lieu tao post
 * @returns FormData
 * @sideEffect Co the loai bo gia tri khong hop le.
 */
const buildCreatePostFormData = (data: PostRequest) => {
  const formData = new FormData();

  formData.append("caption", data.caption ?? "");
  formData.append("hashtags", JSON.stringify(data.hashtags ?? []));

  if (data.musicId) {
    formData.append("musicId", data.musicId);
  }

  data.images.forEach((uri, index) => {
    if (!uri) {
      return;
    }

    const mimeType = inferMimeType(uri);
    const fileName = inferFileName(uri, index + 1, mimeType);

    formData.append("images", {
      uri,
      name: fileName,
      type: mimeType,
    } as any);
  });

  return formData;
};

/**
 * Kiem tra anh tu xa (URL).
 * @param uri Duong dan anh
 * @returns true neu la URL
 */
const isRemoteImage = (uri: string) => /^https?:\/\//i.test(uri);

/**
 * Tao FormData cho request sua bai viet.
 * @param data Du lieu sua post
 * @returns FormData
 * @sideEffect Tach anh cu (url) va anh moi (local) de upload.
 */
const buildEditPostFormData = (data: EditPostRequest) => {
  const formData = new FormData();

  formData.append("caption", data.caption ?? "");
  formData.append("hashtags", JSON.stringify(data.hashtags ?? []));

  if (data.musicId !== undefined) {
    formData.append("musicId", data.musicId ?? "null");
  }

  const safeImages = Array.from(
    new Set((data.existingImages ?? []).filter(Boolean)),
  );
  const existingImages = safeImages.filter(isRemoteImage);
  const newLocalImages = safeImages.filter((uri) => !isRemoteImage(uri));

  formData.append("existingImages", JSON.stringify(existingImages));

  newLocalImages.forEach((uri, index) => {
    const mimeType = inferMimeType(uri);
    const fileName = inferFileName(uri, index + 1, mimeType);

    formData.append("images", {
      uri,
      name: fileName,
      type: mimeType,
    } as any);
  });

  return formData;
};

/**
 * Lay danh sach bai viet theo user.
 * @param userId ID nguoi dung
 * @returns Danh sach bai viet
 * @sideEffect Can token.
 */
const getPostsByUserId = (userId: string): Promise<ApiResponse<Post[]>> =>
  apiAuthRequest<ApiResponse<Post[]>>(`/posts/byUser/${userId}`, {
    method: "GET",
  });

/**
 * Tao bai viet moi.
 * @param data Du lieu post
 * @returns Bai viet vua tao
 * @sideEffect Can token, upload multipart.
 */
const createPost = (data: PostRequest): Promise<ApiResponse<Post>> =>
  apiAuthRequest<ApiResponse<Post>>(`/posts/create`, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: buildCreatePostFormData(data),
  });
/**
 * Lay chi tiet bai viet.
 * @param postId ID bai viet
 * @returns Bai viet
 * @sideEffect Can token.
 */
const getPostById = (postId: string): Promise<ApiResponse<Post>> =>
  apiAuthRequest<ApiResponse<Post>>(`/posts/${postId}`, {
    method: "GET",
  });

/**
 * Xoa bai viet.
 * @param postId ID bai viet
 * @returns Thong diep tu server
 * @sideEffect Can token.
 */
const deletePost = (
  postId: string,
): Promise<ApiResponse<{ message?: string }>> =>
  apiAuthRequest<ApiResponse<{ message?: string }>>(`/posts/delete/${postId}`, {
    method: "DELETE",
  });

/**
 * Chinh sua bai viet.
 * @param postId ID bai viet
 * @param data Du lieu sua post
 * @returns Bai viet sau khi sua
 * @sideEffect Can token, upload multipart.
 */
const editPost = (
  postId: string,
  data: EditPostRequest,
): Promise<ApiResponse<Post>> =>
  apiAuthRequest<ApiResponse<Post>>(`/posts/edit/${postId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: buildEditPostFormData(data),
  });
/**
 * Lay feed bai viet khong phai cua minh.
 * @returns Feed posts
 * @sideEffect Can token.
 */
const getPostsNotByMe = (): Promise<FeedPostsResponse> =>
  apiAuthRequest<FeedPostsResponse>(`/posts/getPostsNotByMe`, {
    method: "GET",
  });

/**
 * Alias cho getPostsNotByMe.
 * @returns Feed posts
 */
const getPostsNotMe = (): Promise<FeedPostsResponse> => getPostsNotByMe();

/**
 * Ghi nhan luot xem bai viet.
 * @param postId ID bai viet
 * @returns Thong diep tu server
 * @sideEffect Can token.
 */
const viewPost = (postId: string): Promise<ApiResponse<{ message?: string }>> =>
  apiAuthRequest<ApiResponse<{ message?: string }>>(`/posts/${postId}/view`, {
    method: "POST",
  });

/**
 * Cac API bai viet.
 */
export const postService = {
  getPostsByUserId,
  createPost,
  getPostById,
  deletePost,
  editPost,
  getPostsNotByMe,
  getPostsNotMe,
  viewPost,
};
