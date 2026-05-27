import { API_BASE_URL, apiRequest } from "./api";

type RefreshRecommenderResponse = {
  success: boolean;
  refreshed: boolean;
  error?: string | null;
};

/**
 * Xac dinh base URL cho AI service.
 * @returns Base URL cho AI
 */
const resolveAiBaseUrl = () => {
  const configured =
    process.env.EXPO_PUBLIC_AI_API_URL ?? process.env.AI_API_URL ?? "";

  if (configured.trim()) {
    return configured.trim().replace(/\/+$/, "");
  }

  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  return origin.replace(/:3000(?=\/|$)/, ":3001").replace(/\/+$/, "");
};

const AI_BASE_URL = resolveAiBaseUrl();

/**
 * Yeu cau AI refresh danh sach goi y.
 * @returns Ket qua refresh hoac null neu loi
 * @sideEffect Goi API public, co log khi that bai.
 */
const refreshRecommender = async () => {
  try {
    return await apiRequest<RefreshRecommenderResponse>(
      `${AI_BASE_URL}/recommender/refresh`,
      {
        method: "POST",
        timeoutMs: 20000,
      },
    );
  } catch (error) {
    console.log("[recommender] refresh failed", error);
    return null;
  }
};

/**
 * Cac API lien quan den recommender.
 */
export const recommenderService = {
  refreshRecommender,
};
