import { apiAuthRequest, apiRequest, type ApiResponse } from "./api";

export interface Music {
  _id: string;
  title: string;
  artist: string;
  url: string;
  image: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;

}

/**
 * Lay toan bo danh sach nhac.
 * @returns Danh sach music
 * @sideEffect Can token.
 */
const getAllMusics = (): Promise<ApiResponse<Music[]>> =>
  apiAuthRequest<ApiResponse<Music[]>>(`/musics`, {
    method: "GET",
});
/**
 * Lay chi tiet nhac theo ID.
 * @param musicId ID nhac
 * @returns Thong tin music
 * @sideEffect Can token.
 */
const getMusicById = (musicId:string) : Promise<ApiResponse<Music>> =>
  apiAuthRequest<ApiResponse<Music>>(`/musics/${musicId}`, {
    method: "GET",
  });
/**
 * Cac API ve nhac.
 */
export const musicService = {
  getAllMusics,
  getMusicById
};