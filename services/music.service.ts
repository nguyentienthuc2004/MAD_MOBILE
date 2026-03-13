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

const getAllMusics = (): Promise<ApiResponse<Music[]>> =>
  apiAuthRequest<ApiResponse<Music[]>>(`/musics`, {
    method: "GET",
});
const getMusicById = (musicId:string) : Promise<ApiResponse<Music>> =>
  apiAuthRequest<ApiResponse<Music>>(`/musics/${musicId}`, {
    method: "GET",
  });
export const musicService = {
  getAllMusics,
  getMusicById
};