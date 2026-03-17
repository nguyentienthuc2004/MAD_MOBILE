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
    createdAt?: string;
    updatedAt?: string;
};

export type MessageDto = {
    _id: string;
    room_id: string;
    sender_id: string;
    content: string;
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

    getMessages(roomId: string, params?: { before?: string }) {
        const query = params?.before ? `?before=${encodeURIComponent(params.before)}` : "";

        return apiAuthRequest<GetMessagesResponse>(
            `/chat/rooms/${roomId}/messages${query}`,
            {
                method: "GET",
            },
        );
    },

    sendMessage(roomId: string, content: string) {
        return apiAuthRequest<SendMessageResponse>(`/chat/rooms/${roomId}/messages`, {
            method: "POST",
            body: { content },
        });
    },

    updateNickname(roomId: string, userId: string, nickname: string) {
        return apiAuthRequest<EditNicknamesResponse>(`/chat/rooms/${roomId}/users/${userId}/nickname`, {
            method: "PATCH",
            body: { nickname },
        });
    },
};

