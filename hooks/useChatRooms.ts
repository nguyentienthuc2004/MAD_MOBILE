import { useCallback, useEffect, useState } from "react";

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

    const fetchRooms = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await chatService.getRooms();

            const apiRooms = res.data?.rooms ?? [];

            // Loại bỏ các phòng trùng _id để tránh cảnh báo "Encountered two children with the same key"
            const uniqueRooms = apiRooms.filter(
                (room, index, arr) =>
                    index === arr.findIndex((r) => r._id === room._id),
            );

            const mapped: ChatRoom[] = uniqueRooms.map((room) => {
                const rawLastContent = room.lastMessage?.content?.trim() || "";
                const isLastMine = meId
                    ? room.lastMessage?.sender === meId
                    : false;

                const lastMessageText = rawLastContent
                    ? isLastMine
                        ? `Bạn: ${rawLastContent}`
                        : rawLastContent
                    : "Chưa có tin nhắn nào";
                const hasTitle = (room as any).title && (room as any).title.trim();

                // Nếu là phòng friend, ưu tiên avatar & tên của user không phải mình
                if (room.typeRoom === "friend") {
                    const otherMembers = room.users?.filter((u) =>
                        meId ? u.user_id !== meId : true,
                    );

                    const other = otherMembers && otherMembers.length > 0
                        ? otherMembers[0]
                        : undefined;

                    // Đoạn chat 1-1: luôn ưu tiên hiển thị BIỆT DANH của người còn lại
                    const fallbackName =
                        other?.nickname ||
                        room.users?.map((u) => u.nickname).join(", ") ||
                        (hasTitle ? (room as any).title : "Phòng chat");

                    return {
                        id: room._id,
                        name: fallbackName,
                        lastMessage: lastMessageText,
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
                    lastMessage: lastMessageText,
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
    }, [_token, meId]);

    useEffect(() => {
        void fetchRooms();
    }, [fetchRooms]);

    return { rooms, loading, error, refetch: fetchRooms };
}

