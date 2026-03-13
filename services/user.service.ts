import { apiRequest, type ApiResponse } from "./api";

export interface AppUser {
    _id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export type GetUsersResponse = ApiResponse<AppUser[]>;

export const userService = {
    getUsers() {
        return apiRequest<GetUsersResponse>("/users", {
            method: "GET",
        });
    },
};
