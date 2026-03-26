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

export const chatService = {
    getRooms() {
        return apiAuthRequest<GetRoomsResponse>("/chat/rooms", {
            method: "GET",
        });
    },

    createRoom(receiverId: string) {
        return apiAuthRequest<PostRoomResponse>("/chat/rooms", {
            method: "POST",
            body: { receiverId },
        });
    },

    createGroup(title: string, usersId: string[], avatar?: string) {
        return apiAuthRequest<CreateGroupResponse>("/chat/groups", {
            method: "POST",
            body: { title, avatar, usersId },
        });
    },

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

    updateNickname(roomId: string, userId: string, nickname: string) {
        return apiAuthRequest<EditNicknamesResponse>(`/chat/rooms/${roomId}/users/${userId}/nickname`, {
            method: "PATCH",
            body: { nickname },
        });
    },

    markMessagesSeen(roomId: string) {
        return apiAuthRequest<SeenMessagesResponse>(`/chat/${roomId}/seen`, {
            method: "PATCH",
        });
    },

    deleteMessage(roomId: string, messageId: string) {
        return apiAuthRequest<ApiEnvelope<unknown>>(
            `/chat/rooms/${roomId}/messages/${messageId}`,
            {
                method: "DELETE",
            },
        );
    },
};

