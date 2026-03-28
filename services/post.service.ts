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

const inferMimeType = (uri: string) => {
  const normalized = uri.toLowerCase().split("?")[0];

  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".heic")) return "image/heic";
  if (normalized.endsWith(".webp")) return "image/webp";

  return "image/jpeg";
};

const inferFileName = (uri: string, index: number, mimeType: string) => {
  const normalized = uri.split("?")[0];
  const fromUri = normalized.split("/").pop();

  if (fromUri && fromUri.includes(".")) {
    return fromUri;
  }

  const extension = mimeType.split("/")[1] || "jpg";
  return `post-image-${index}.${extension}`;
};

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

const isRemoteImage = (uri: string) => /^https?:\/\//i.test(uri);

const buildEditPostFormData = (data: EditPostRequest) => {
  const formData = new FormData();

  formData.append("caption", data.caption ?? "");
  formData.append("hashtags", JSON.stringify(data.hashtags ?? []));

  if (data.musicId !== undefined) {
    formData.append("musicId", data.musicId ?? "null");
  }

  const safeImages = Array.from(new Set((data.existingImages ?? []).filter(Boolean)));
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

const getPostsByUserId = (userId: string): Promise<ApiResponse<Post[]>> =>
  apiAuthRequest<ApiResponse<Post[]>>(`/posts/byUser/${userId}`, {
    method: "GET",
  });

const createPost = (data: PostRequest): Promise<ApiResponse<Post>> =>
  apiAuthRequest<ApiResponse<Post>>(`/posts/create`, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: buildCreatePostFormData(data),
  });
const getPostById = (postId:string) : Promise<ApiResponse<Post>> =>
  apiAuthRequest<ApiResponse<Post>>(`/posts/${postId}`, {
    method: "GET",
  });

const deletePost = (postId: string): Promise<ApiResponse<{ message?: string }>> =>
  apiAuthRequest<ApiResponse<{ message?: string }>>(`/posts/delete/${postId}`, {
    method: "DELETE",
  });

const editPost = (postId:string, data: EditPostRequest): Promise<ApiResponse<Post>> =>
  apiAuthRequest<ApiResponse<Post>>(`/posts/edit/${postId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: buildEditPostFormData(data),
  });
const getPostsNotByMe = (): Promise<ApiResponse<Post[]>> =>
  apiAuthRequest<ApiResponse<Post[]>>(`/posts/getPostsNotByMe`, {
    method: "GET",
  });

const getPostsNotMe = (): Promise<ApiResponse<Post[]>> => getPostsNotByMe();
  
export const postService = {
  getPostsByUserId,
  createPost,
  getPostById,
  deletePost,
  editPost,
  getPostsNotByMe,
  getPostsNotMe,
};