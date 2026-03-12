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
}
export interface PostRequest {
  caption: string;
  hashtags: string[];
  images: string[];
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

export const getPostsByUserId = (userId: string): Promise<ApiResponse<Post[]>> =>
  apiAuthRequest<ApiResponse<Post[]>>(`/posts/byUser/${userId}`, {
    method: "GET",
  });

export const createPost = (data: PostRequest): Promise<ApiResponse<Post>> =>
  apiAuthRequest<ApiResponse<Post>>(`/posts/create`, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: buildCreatePostFormData(data),
  });

export const postService = {
  getPostsByUserId,
  createPost,
};