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

type GetMessagesResponse = ApiEnvelope<{
    messages: MessageDto[];
}>;

type SendMessageResponse = ApiEnvelope<{
    message: MessageDto;
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

    getMessages(roomId: string) {
        return apiAuthRequest<GetMessagesResponse>(`/chat/rooms/${roomId}/messages`, {
            method: "GET",
        });
    },

    sendMessage(roomId: string, content: string) {
        return apiAuthRequest<SendMessageResponse>(`/chat/rooms/${roomId}/messages`, {
            method: "POST",
            body: { content },
        });
    },
};

