import { ChatRoom } from "@/hooks/useChatRooms";
import { create } from "zustand";

interface ChatStoreState {
    unreadCount: number;
    setRooms: (rooms: ChatRoom[]) => void;
    setUnreadCount: (count: number) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
    unreadCount: 0,
    setRooms: (rooms) => {
        const unread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
        set({ unreadCount: unread });
    },
    setUnreadCount: (count) => set({ unreadCount: count }),
}));
