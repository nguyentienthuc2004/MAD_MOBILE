import { useCallback, useEffect, useState } from "react";

import { chatService, type MessageDto } from "@/services/chat.service";
import { socket } from "@/socket/socket";
import { useAuth } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";

/**
 * Mo ta phong chat da duoc map tu API cho UI.
 */
export type ChatRoom = {
    id: string;
    name: string;
    lastMessage: string;
    updatedAt: string;
    unreadCount: number;
    avatar?: string;
};

// Sau này bạn có thể truyền token thật từ useAuth / authStore
// Hiện tại token được gắn tự động qua configureApiAuth + apiAuthRequest
/**
 * Hook tai danh sach phong chat va cap nhat real-time.
 * @param _token Token truyen vao neu can tuong lai
 * @returns Danh sach phong, loading, error va ham refetch
 * @sideEffect Goi API, dang ky socket events, cap nhat store unread.
 */
export function useChatRooms(_token?: string) {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const meId = useAuth((state) => state.user?._id ?? null);

    const setChatRoomsUnread = useChatStore((s) => s.setRooms);
    /**
     * Lay danh sach phong chat tu backend va map cho UI.
     * @returns Void
     * @sideEffect Cap nhat state rooms/unread va tham gia socket rooms.
     */
    const fetchRooms = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await chatService.getRooms();

            const apiRooms = res.data?.rooms ?? [];

            // Loai bo cac phong trung _id de tranh canh bao key trung trong React
            const uniqueRooms = apiRooms.filter(
                (room, index, arr) =>
                    index === arr.findIndex((r) => r._id === room._id),
            );

            // An phong chat da bi xoa (theo deletedAt cua user),
            // nhung neu co tin nhan moi hon deletedAt thi van hien thi
            const filteredRooms = uniqueRooms.filter((room) => {
                const me = room.users?.find((u) => u.user_id === meId);
                const deletedAt = me?.deletedAt;
                if (!deletedAt) return true;
                // Neu co lastMessage moi hon deletedAt thi van hien thi
                if (room.lastMessage?.createdAt) {
                    try {
                        const lastMsgTime = new Date(room.lastMessage.createdAt).getTime();
                        const deletedAtTime = new Date(deletedAt).getTime();
                        if (lastMsgTime > deletedAtTime) return true;
                    } catch { }
                }
                // Nguoc lai thi an
                return false;
            });

            const mapped: ChatRoom[] = filteredRooms.map((room) => {
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

                // Neu la phong friend, uu tien avatar & ten cua user khong phai minh
                if (room.typeRoom === "friend") {
                    const otherMembers = room.users?.filter((u) =>
                        meId ? u.user_id !== meId : true,
                    );

                    const other = otherMembers && otherMembers.length > 0
                        ? otherMembers[0]
                        : undefined;

                    // Doan chat 1-1: uu tien hien thi biet danh cua nguoi con lai
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
                        // avatar: neu co title rieng thi dung avatar room;
                        // nguoc lai dung avatar cua user con lai
                        avatar: hasTitle
                            ? (room as any).avatar || other?.avatar || undefined
                            : other?.avatar || (room as any).avatar || undefined,
                        unreadCount: typeof (room as any).unreadCount === "number"
                            ? (room as any).unreadCount
                            : 0,
                    };
                }

                // Cac loai phong khac: uu tien dung title + avatar room
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
                    unreadCount: typeof (room as any).unreadCount === "number"
                        ? (room as any).unreadCount
                        : 0,
                };
            });

            setRooms(mapped);
            setChatRoomsUnread(mapped);

            // Tham gia tat ca room qua socket de nhan SERVER_SEND_MESSAGE
            if (meId) {
                mapped.forEach((room) => {
                    socket.emit("JOIN_ROOM", { roomId: room.id, userId: meId });
                });
            }
        } catch (err: any) {
            setError(err.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }, [_token, meId]);

    useEffect(() => {
        void fetchRooms();
    }, [fetchRooms]);

    // Cap nhat danh sach phong theo thoi gian thuc khi co tin nhan moi
    useEffect(() => {
        if (!meId) return;

        /**
         * Xu ly tin nhan den de cap nhat preview va unread.
         * @param m Payload tin nhan tu socket
         * @returns void
         */
        const handleIncomingMessage = (m: MessageDto) => {
            if (!m || !m.room_id) return;

            const content = (m.content || "").trim();
            if (!content) return;

            const roomId = String(m.room_id);
            const isMine = String(m.sender_id) === String(meId);

            const timeText = m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                })
                : "";

            setRooms((prev) => {
                const exists = prev.some((r) => r.id === roomId);
                if (!exists) return prev;

                const updated = prev.map((room) => {
                    if (room.id !== roomId) return room;

                    const lastMessageText = isMine
                        ? `Bạn: ${content}`
                        : content;

                    return {
                        ...room,
                        lastMessage: lastMessageText,
                        updatedAt: timeText || room.updatedAt,
                        // Neu tin nhan la cua minh thi khong tang unread;
                        // neu cua nguoi khac thi +1 de hien thi badge
                        unreadCount: isMine
                            ? room.unreadCount
                            : room.unreadCount + 1,
                    };
                });

                // Dua room vua co tin nhan len dau danh sach
                updated.sort((a, b) => {
                    if (a.id === roomId && b.id !== roomId) return -1;
                    if (b.id === roomId && a.id !== roomId) return 1;
                    return 0;
                });

                // Cap nhat tong so tin nhan chua doc vao store de badge realtime
                setChatRoomsUnread(updated);
                return updated;
            });
        };

        // Nhan tin nhan moi tu server
        socket.on("SERVER_SEND_MESSAGE", handleIncomingMessage);

        return () => {
            // Huy lang nghe khi unmount
            socket.off("SERVER_SEND_MESSAGE", handleIncomingMessage);
        };
    }, [meId]);

    return { rooms, loading, error, refetch: fetchRooms };
}

