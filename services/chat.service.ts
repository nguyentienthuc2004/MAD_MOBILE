import { apiAuthRequest } from "./api";

type ApiEnvelope<T> = {
    success: boolean;
    message?: string;
    code?: string;
    data: T;
};

export type RoomUser = {
    user_id: string;
    nickname: string;
    avatar?: string;
    role: string;
    deletedAt?: string;
};

export type RoomLastMessage = {
    content: string;
    sender: string;
    createdAt: string;
};

export type RoomChatDto = {
    _id: string;
    title: String,
    avatar: String,
    typeRoom: String, // Ví dụ: "group" hoặc "friend"
    status: String,
    users: RoomUser[];
    participantsHash: string;
    isDeleted?: boolean;
    lastMessage?: RoomLastMessage;
    unreadCount?: number;
    createdAt?: string;
    updatedAt?: string;
};

export type MessageDto = {
    _id: string;
    room_id: string;
    sender_id: string;
    content: string;
    images?: string[];
    replyToMessage?: string;
    isDeleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

type GetRoomsResponse = ApiEnvelope<{
    rooms: RoomChatDto[];
}>;

type PostRoomResponse = ApiEnvelope<{
    room: RoomChatDto;
}>;

type CreateGroupResponse = ApiEnvelope<{
    group: RoomChatDto;
}>;

type GetMessagesResponse = ApiEnvelope<{
    messages: MessageDto[];
}>;

type SendMessageResponse = ApiEnvelope<{
    message: MessageDto;
}>;

type EditNicknamesResponse = ApiEnvelope<{
    room: RoomChatDto;
}>;

type SeenMessagesResponse = ApiEnvelope<{
    modifiedCount?: number;
}>;

/**
 * Cac API chat (rooms, messages, group).
 */
export const chatService = {
    /**
     * Cap nhat tieu de phong chat.
     * @param roomId ID phong
     * @param title Tieu de moi
     * @returns Room da cap nhat
     * @sideEffect Can token.
     */
    updateRoomTitle(roomId: string, title: string) {
        return apiAuthRequest<ApiEnvelope<{ room: RoomChatDto }>>(`/chat/room/${roomId}/title`, {
            method: "PATCH",
            body: { title },
        });
    },

    /**
     * Cap nhat avatar phong chat (url hoac file).
     * @param roomId ID phong
     * @param avatar Url hoac local uri
     * @returns Room da cap nhat
     * @sideEffect Can token, co the upload multipart.
     */
    updateRoomAvatar(roomId: string, avatar: string) {
        const trimmed = typeof avatar === "string" ? avatar.trim() : "";
        const isRemoteUrl = /^https?:\/\//i.test(trimmed);

        if (isRemoteUrl) {
            return apiAuthRequest<ApiEnvelope<{ room: RoomChatDto }>>(`/chat/room/${roomId}/avatar`, {
                method: "PATCH",
                body: { avatar: trimmed },
            });
        }

        const formData = new FormData();
        formData.append(
            "avatar",
            {
                uri: trimmed,
                name: "group-avatar.jpg",
                type: "image/jpeg",
            } as any,
        );

        return apiAuthRequest<ApiEnvelope<{ room: RoomChatDto; avatarUrl?: string }>>(
            `/chat/room/${roomId}/avatar`,
            {
                method: "PATCH",
                body: formData,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            },
        );
    },
    /**
     * Lay danh sach phong chat cua nguoi dung.
     * @returns Danh sach rooms
     * @sideEffect Can token.
     */
    getRooms() {
        return apiAuthRequest<GetRoomsResponse>("/chat/rooms", {
            method: "GET",
        });
    },

    /**
     * Tao phong chat 1-1.
     * @param receiverId ID nguoi nhan
     * @returns Room vua tao
     * @sideEffect Can token.
     */
    createRoom(receiverId: string) {
        return apiAuthRequest<PostRoomResponse>("/chat/rooms", {
            method: "POST",
            body: { receiverId },
        });
    },

    /**
     * Tao phong group.
     * @param title Ten group
     * @param usersId Danh sach user tham gia
     * @param avatar Avatar (url hoac uri)
     * @returns Group vua tao
     * @sideEffect Can token.
     */
    createGroup(title: string, usersId: string[], avatar?: string) {
        return apiAuthRequest<CreateGroupResponse>("/chat/groups", {
            method: "POST",
            body: { title, avatar, usersId },
        });
    },

    /**
     * Lay tin nhan theo room (co the loc theo before/keyword).
     * @param roomId ID phong
     * @param params Bo loc
     * @returns Danh sach tin nhan
     * @sideEffect Can token.
     */
    getMessages(roomId: string, params?: { before?: string; keyword?: string }) {
        let query = "";
        const queryParams: string[] = [];
        if (params?.before) {
            queryParams.push(`before=${encodeURIComponent(params.before)}`);
        }
        if (params?.keyword) {
            queryParams.push(`keyword=${encodeURIComponent(params.keyword)}`);
        }
        if (queryParams.length > 0) {
            query = `?${queryParams.join("&")}`;
        }
        return apiAuthRequest<GetMessagesResponse>(
            `/chat/rooms/${roomId}/messages${query}`,
            {
                method: "GET",
            },
        );
    },

    /**
     * Gui tin nhan text.
     * @param roomId ID phong
     * @param content Noi dung
     * @param options Tuy chon reply
     * @returns Tin nhan vua gui
     * @sideEffect Can token.
     */
    sendMessage(
        roomId: string,
        content: string,
        options?: { replyToMessageId?: string },
    ) {
        return apiAuthRequest<SendMessageResponse>(`/chat/rooms/${roomId}/messages`, {
            method: "POST",
            body: {
                content,
                replyMessageId: options?.replyToMessageId,
            },
        });
    },

    /**
     * Gui tin nhan hinh anh.
     * @param roomId ID phong
     * @param imageUris Uri hoac danh sach uri
     * @returns Tin nhan vua gui
     * @sideEffect Can token, upload multipart.
     */
    sendImage(roomId: string, imageUris: string | string[]) {
        const formData = new FormData();

        const uris = Array.isArray(imageUris) ? imageUris : [imageUris];

        uris.forEach((uri, index) => {
            formData.append(
                "images",
                {
                    uri,
                    name: `image-${index + 1}.jpg`,
                    type: "image/jpeg",
                } as any,
            );
        });

        return apiAuthRequest<SendMessageResponse>(
            `/chat/rooms/${roomId}/messages/image`,
            {
                method: "POST",
                body: formData,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            },
        );
    },

    /**
     * Cap nhat biet danh cua user trong phong.
     * @param roomId ID phong
     * @param userId ID user
     * @param nickname Biet danh moi
     * @returns Room da cap nhat
     * @sideEffect Can token.
     */
    updateNickname(roomId: string, userId: string, nickname: string) {
        return apiAuthRequest<EditNicknamesResponse>(`/chat/rooms/${roomId}/users/${userId}/nickname`, {
            method: "PATCH",
            body: { nickname },
        });
    },

    /**
     * Danh dau da xem tin nhan trong room.
     * @param roomId ID phong
     * @returns So luong tin nhan da cap nhat
     * @sideEffect Can token.
     */
    markMessagesSeen(roomId: string) {
        return apiAuthRequest<SeenMessagesResponse>(`/chat/${roomId}/seen`, {
            method: "PATCH",
        });
    },

    /**
     * Xoa tin nhan theo ID.
     * @param roomId ID phong
     * @param messageId ID tin nhan
     * @returns Ket qua xoa
     * @sideEffect Can token.
     */
    deleteMessage(roomId: string, messageId: string) {
        return apiAuthRequest<ApiEnvelope<unknown>>(
            `/chat/rooms/${roomId}/messages/${messageId}`,
            {
                method: "DELETE",
            },
        );
    },

    /**
     * Xoa phong chat (soft delete).
     * @param roomId ID phong
     * @returns Ket qua xoa
     * @sideEffect Can token.
     */
    deleteRoom(roomId: string) {
        return apiAuthRequest<ApiEnvelope<unknown>>(`/chat/rooms/${roomId}/delete`, {
            method: "DELETE",
        });
    },

    /**
     * Them thanh vien vao group.
     * @param roomId ID phong
     * @param usersId Danh sach user can them
     * @returns Thong tin room va danh sach thanh vien them
     * @sideEffect Can token.
     */
    addMembersToGroup(roomId: string, usersId: string[]) {
        return apiAuthRequest<
            ApiEnvelope<{
                room: RoomChatDto;
                addedIds: string[];
                restoredIds: string[];
            }>
        >(`/chat/groups/${roomId}/member`, {
            method: "POST",
            body: { usersId },
        });
    },

    /**
     * Roi khoi group.
     * @param roomId ID phong
     * @returns ID phong da roi
     * @sideEffect Can token.
     */
    leaveGroup(roomId: string) {
        return apiAuthRequest<ApiEnvelope<{ roomId: string }>>(`/chat/groups/${roomId}/leave`, {
            method: "DELETE",
        });
    },
};

