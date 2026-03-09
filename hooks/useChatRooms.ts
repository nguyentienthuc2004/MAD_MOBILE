import { useEffect, useState } from "react";

import { chatService } from "@/services/chat.service";
import { useAuth } from "@/stores/auth.store";

export type ChatRoom = {
    id: string;
    name: string;
    lastMessage: string;
    updatedAt: string;
    avatar?: string;
};

// Sau này bạn có thể truyền token thật từ useAuth / authStore
// Hiện tại token được gắn tự động qua configureApiAuth + apiAuthRequest
export function useChatRooms(_token?: string) {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const meId = useAuth((state) => state.user?._id ?? null);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await chatService.getRooms();

                const apiRooms = res.data?.rooms ?? [];

                const mapped: ChatRoom[] = apiRooms.map((room) => {
                    const hasTitle = (room as any).title && (room as any).title.trim();

                    // Nếu là phòng friend, ưu tiên avatar & tên của user không phải mình
                    if (room.typeRoom === "friend") {
                        const otherMembers = room.users?.filter((u) =>
                            meId ? u.user_id !== meId : true,
                        );

                        const other = otherMembers && otherMembers.length > 0
                            ? otherMembers[0]
                            : undefined;

                        const fallbackName = hasTitle
                            ? (room as any).title
                            : other?.nickname ||
                            room.users?.map((u) => u.nickname).join(", ") ||
                            "Phòng chat";

                        return {
                            id: room._id,
                            name: fallbackName,
                            lastMessage:
                                room.lastMessage?.content?.trim() || "Chưa có tin nhắn nào",
                            updatedAt: room.updatedAt
                                ? new Date(room.updatedAt).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                                : "",
                            // avatar: nếu có title riêng thì dùng avatar room;
                            // ngược lại dùng avatar của user còn lại
                            avatar: hasTitle
                                ? (room as any).avatar || other?.avatar || undefined
                                : other?.avatar || (room as any).avatar || undefined,
                        };
                    }

                    // Các loại phòng khác: ưu tiên dùng title + avatar room
                    const fallbackName = hasTitle
                        ? (room as any).title
                        : room.users?.map((u) => u.nickname).join(", ") || "Phòng chat";

                    return {
                        id: room._id,
                        name: fallbackName,
                        lastMessage:
                            room.lastMessage?.content?.trim() || "Chưa có tin nhắn nào",
                        updatedAt: room.updatedAt
                            ? new Date(room.updatedAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : "",
                        avatar: (room as any).avatar || undefined,
                    };
                });

                setRooms(mapped);
            } catch (err: any) {
                setError(err.message || "Có lỗi xảy ra");
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, [_token, meId]);

    return { rooms, loading, error };
}

