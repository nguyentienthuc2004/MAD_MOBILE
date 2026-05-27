import { ChatRoom } from "@/hooks/useChatRooms";
import { create } from "zustand";

interface ChatStoreState {
    unreadCount: number;
    setRooms: (rooms: ChatRoom[]) => void;
    setUnreadCount: (count: number) => void;
}

/**
 * Store quan ly badge tin nhan chua doc.
 */
export const useChatStore = create<ChatStoreState>((set) => ({
    unreadCount: 0,
    /**
     * Tinh tong so tin nhan chua doc tu danh sach room.
     * @param rooms Danh sach phong chat
     * @returns void
     * @sideEffect Cap nhat unreadCount trong store.
     */
    setRooms: (rooms) => {
        const unread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
        set({ unreadCount: unread });
    },
    /**
     * Cap nhat so tin nhan chua doc.
     * @param count Tong so unread
     * @returns void
     */
    setUnreadCount: (count) => set({ unreadCount: count }),
}));
