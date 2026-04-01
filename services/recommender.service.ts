import { API_BASE_URL, apiRequest } from "./api";

type RefreshRecommenderResponse = {
  success: boolean;
  refreshed: boolean;
  error?: string | null;
};

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

export const recommenderService = {
  refreshRecommender,
};
