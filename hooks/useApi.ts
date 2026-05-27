// hooks/useApi.ts
import { useCallback, useState } from "react";

/**
 * Hook boc goi API voi trang thai loading va error.
 * @returns { request, loading, error }
 * @sideEffect Cap nhat state loading/error trong hook.
 */
export function useApi<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Thuc thi ham goi API va quan ly trang thai.
   * @param apiCall Ham goi API tra ve Promise<T>
   * @returns Du lieu T neu thanh cong, nguoc lai null
   * @sideEffect Cap nhat loading/error.
   */
  const request = useCallback(async (apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall();
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}