import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { chatService, type MessageDto, type RoomChatDto, type RoomUser } from "@/services/chat.service";
import { socket } from "@/socket/socket";
import { useAuth } from "@/stores/auth.store";

type ChatMessage = {
    id: string;
    content: string;
    isMine: boolean;
    createdAt: string;
    senderId: string;
    kind?: "normal" | "system";
    images?: string[];
    isDeleted?: boolean;
    replyTo?: {
        id: string;
        content: string;
        senderId: string;
        isMine: boolean;
    };
};

type NicknameChangedEvent = {
    roomId: string;
    changerId?: string;
    changerName: string;
    targetId: string;
    targetName: string;
    newNickname: string;
};

type MessageDeletedEvent = {
    roomId: string;
    messageId: string;
    deletedBy: string;
};

type MembersAddedEvent = {
    roomId: string;
    adderId?: string;
    adderName?: string;
    members?: { userId: string; nickname?: string; avatar?: string; role?: string }[];
};

type MemberRemovedEvent = {
    roomId: string;
    changerId?: string;
    changerName?: string;
    targetId: string;
    targetName?: string;
};

type MemberRoleChangedEvent = {
    roomId: string;
    changerId?: string;
    changerName?: string;
    targetId?: string;
    targetName?: string;
    newRole?: string;
    changes?: { userId: string; newRole: string }[];
};

type RoomTitleChangedEvent = {
    roomId: string;
    changerId?: string;
    changerName?: string;
    newTitle: string;
};

type RoomAvatarChangedEvent = {
    roomId: string;
    changerId?: string;
    changerName?: string;
    newAvatar: string;
};

const dedupeMessagesById = (items: ChatMessage[]): ChatMessage[] => {
    const uniqueById = new Map<string, ChatMessage>();

    items.forEach((item) => {
        uniqueById.set(item.id, item);
    });

    return Array.from(uniqueById.values());
};

export default function ChatRoomScreen() {
    const router = useRouter();
    const { roomId, name, systemNotice } = useLocalSearchParams<{ roomId: string; name?: string; systemNotice?: string }>();
    const { user } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [input, setInput] = useState("");
    const [room, setRoom] = useState<RoomChatDto | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [oldestCursor, setOldestCursor] = useState<string | null>(null);
    const [sendingImage, setSendingImage] = useState(false);

    const [typingUsers, setTypingUsers] = useState<
        { userId: string; name?: string }[]
    >([]);

    const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);

    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(
        null,
    );
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [deletingMessage, setDeletingMessage] = useState(false);

    const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
    const shouldAutoScrollRef = useRef<boolean>(true);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef<boolean>(false);
    const systemNoticeConsumedRef = useRef<boolean>(false);

    const meId = user?._id ?? null;

    useEffect(() => {
        if (!roomId) return;
        if (!systemNotice || typeof systemNotice !== "string") return;
        if (systemNoticeConsumedRef.current) return;

        systemNoticeConsumedRef.current = true;
        shouldAutoScrollRef.current = true;

        const systemMsg: ChatMessage = {
            id: `notice-${Date.now()}`,
            content: systemNotice,
            isMine: false,
            senderId: "system",
            createdAt: new Date().toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            }),
            kind: "system",
        };

        setMessages((prev) => [...prev, systemMsg]);
    }, [roomId, systemNotice]);

    const title = useMemo(() => {
        if (!room) {
            return name || "Đoạn chat";
        }

        if (room.typeRoom === "friend") {
            const others = room.users
                ? room.users.filter((u) => (meId ? u.user_id !== meId : true))
                : [];
            const other = others[0] ?? room.users?.[0];

            return (
                other?.nickname ||
                // fallback: nếu có title riêng thì dùng
                (room as any).title ||
                name ||
                "Đoạn chat"
            );
        }

        // Nhóm: ưu tiên title của room, nếu không có thì dùng name param hoặc mặc định
        if ((room as any).title) {
            return String((room as any).title);
        }

        return name || "Nhóm chat";
    }, [room, meId, name]);

    const fetchMessages = useCallback(
        async (options?: { silent?: boolean }) => {
            if (!roomId) return;

            try {
                if (!options?.silent) {
                    setLoading(true);
                }

                const res = await chatService.getMessages(String(roomId));
                const apiMessages: MessageDto[] = res.data?.messages ?? [];

                // Lọc bỏ các message trùng _id để tránh key bị trùng
                const uniqueMessages = apiMessages.filter(
                    (msg, index, arr) =>
                        index === arr.findIndex((m) => m._id === msg._id),
                );

                // Lấy deletedAt của user hiện tại trong room (an toàn hơn)
                let deletedAt: string | null = null;
                if (room && Array.isArray(room.users) && user?._id) {
                    const me = room.users.find(u => String(u.user_id) === String(user._id));
                    if (me && typeof me.deletedAt === "string" && me.deletedAt) {
                        deletedAt = me.deletedAt;
                    }
                }
                // Lọc tin nhắn mới hơn deletedAt (nếu có)
                const filteredMessages = deletedAt
                    ? uniqueMessages.filter(m => !m.createdAt || new Date(m.createdAt) > new Date(deletedAt!))
                    : uniqueMessages;

                // Cập nhật cursor và trạng thái còn tin nhắn cũ hay không
                if (filteredMessages.length > 0) {
                    const oldest = filteredMessages[filteredMessages.length - 1];
                    setOldestCursor(oldest.createdAt ?? null);
                    // Nếu lấy đủ 20 tin thì có thể còn, nếu ít hơn thì coi như hết
                    setHasMore(filteredMessages.length >= 20);
                } else {
                    setOldestCursor(null);
                    setHasMore(false);
                }

                // Tạo map để dễ tìm tin nhắn gốc khi có replyToMessage
                const byId = new Map<string, MessageDto>();
                filteredMessages.forEach((m) => {
                    byId.set(m._id, m);
                });

                const mapped: ChatMessage[] = [...filteredMessages]
                    .reverse()
                    .map((m) => {
                        const isDeleted = !!m.isDeleted;
                        const base: ChatMessage = {
                            id: m._id,
                            content: isDeleted ? "Tin nhắn đã xoá" : m.content,
                            isMine: meId ? m.sender_id === meId : false,
                            senderId: m.sender_id,
                            createdAt: m.createdAt
                                ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                                : "",
                            kind: "normal",
                            images: isDeleted ? [] : m.images,
                            isDeleted,
                        };

                        if (m.replyToMessage && !isDeleted) {
                            const parent = byId.get(m.replyToMessage);
                            if (parent) {
                                base.replyTo = {
                                    id: parent._id,
                                    content: parent.content,
                                    senderId: parent.sender_id,
                                    isMine: meId ? parent.sender_id === meId : false,
                                };
                            }
                        }

                        return base;
                    });

                setMessages((prev) => {
                    const systemMessages = prev.filter((m) => m.kind === "system");
                    return dedupeMessagesById([...mapped, ...systemMessages]);
                });
            } catch {
                // có thể hiển thị toast / alert sau
            } finally {
                if (!options?.silent) {
                    setLoading(false);
                }
            }
        },
        [meId, roomId, room, user?._id],
    );

    useEffect(() => {
        void fetchMessages();
    }, [fetchMessages]);

    const loadMoreMessages = useCallback(async () => {
        if (!roomId || loadingMore || !hasMore || !oldestCursor) return;

        try {
            setLoadingMore(true);

            const res = await chatService.getMessages(String(roomId), {
                before: oldestCursor,
            });
            const apiMessages: MessageDto[] = res.data?.messages ?? [];

            if (apiMessages.length === 0) {
                setHasMore(false);
                return;
            }

            const uniqueMessages = apiMessages.filter(
                (msg, index, arr) =>
                    index === arr.findIndex((m) => m._id === msg._id),
            );

            const byId = new Map<string, MessageDto>();
            uniqueMessages.forEach((m) => {
                byId.set(m._id, m);
            });

            const mapped: ChatMessage[] = [...uniqueMessages]
                .reverse()
                .map((m) => {
                    const isDeleted = !!m.isDeleted;
                    const base: ChatMessage = {
                        id: m._id,
                        content: isDeleted ? "Tin nhắn đã xoá" : m.content,
                        isMine: meId ? m.sender_id === meId : false,
                        senderId: m.sender_id,
                        createdAt: m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : "",
                        kind: "normal",
                        images: isDeleted ? [] : m.images,
                        isDeleted,
                    };

                    if (m.replyToMessage && !isDeleted) {
                        const parent = byId.get(m.replyToMessage);
                        if (parent) {
                            base.replyTo = {
                                id: parent._id,
                                content: parent.content,
                                senderId: parent.sender_id,
                                isMine: meId ? parent.sender_id === meId : false,
                            };
                        }
                    }

                    return base;
                });

            setMessages((prev) =>
                dedupeMessagesById([
                    // prepend tin nhắn cũ hơn lên đầu danh sách
                    ...mapped,
                    ...prev,
                ]),
            );

            const oldest = uniqueMessages[uniqueMessages.length - 1];
            if (oldest?.createdAt) {
                setOldestCursor(oldest.createdAt);
            } else {
                setHasMore(false);
            }
        } catch {
            // có thể hiển thị toast / alert sau
        } finally {
            setLoadingMore(false);
        }
    }, [roomId, loadingMore, hasMore, oldestCursor, meId]);

    const fetchRoom = useCallback(async () => {
        if (!roomId) return;

        try {
            const res = await chatService.getRooms();
            const apiRooms: RoomChatDto[] = res.data?.rooms ?? [];
            const found = apiRooms.find((r) => r._id === roomId);
            setRoom(found ?? null);
        } catch {
            // bỏ qua lỗi, chỉ ảnh hưởng phần UI trống
        }
    }, [roomId]);

    useEffect(() => {
        void fetchRoom();
    }, [fetchRoom]);

    // Lắng nghe sự kiện đổi avatar realtime
    useEffect(() => {
        if (!roomId) return;
        const handleUserAvatarChanged = (payload: { userId: string; avatarUrl: string }) => {
            // Cập nhật avatar cho user tương ứng trong room.users
            setRoom(prev => {
                if (!prev || !prev.users) return prev;
                const updatedUsers = prev.users.map(u =>
                    String(u.user_id) === String(payload.userId)
                        ? { ...u, avatar: payload.avatarUrl }
                        : u
                );
                return { ...prev, users: updatedUsers };
            });
        };
        socket.on("USER_AVATAR_CHANGED", handleUserAvatarChanged);
        return () => {
            socket.off("USER_AVATAR_CHANGED", handleUserAvatarChanged);
        };
    }, [roomId]);

    // Đánh dấu đã xem khi mở phòng chat
    useEffect(() => {
        if (!roomId) return;

        void chatService
            .markMessagesSeen(String(roomId))
            .catch(() => {
                // có thể hiển thị toast / log lỗi nếu cần
            });
    }, [roomId]);

    const handleRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await Promise.all([fetchMessages({ silent: true }), fetchRoom()]);
        } finally {
            setRefreshing(false);
        }
    }, [fetchMessages, fetchRoom]);

    // Lắng nghe tin nhắn realtime qua Socket.IO
    useEffect(() => {
        if (!roomId || !meId) return;

        const roomKey = String(roomId);

        const handleTyping = (payload: {
            roomId: string;
            userId: string;
            name?: string;
        }) => {
            try {
                if (!payload) return;

                const key = String(roomId);
                if (String(payload.roomId) !== key) return;

                // Bỏ qua nếu là chính mình
                if (meId && String(payload.userId) === String(meId)) return;

                setTypingUsers((prev) => {
                    const exists = prev.some(
                        (u) => String(u.userId) === String(payload.userId),
                    );
                    if (exists) return prev;

                    return [
                        ...prev,
                        {
                            userId: String(payload.userId),
                            name: payload.name,
                        },
                    ];
                });
            } catch (error) {
                console.log("[CHAT] SERVER_TYPING handle error", error);
            }
        };

        const handleStopTyping = (payload: { roomId: string; userId: string }) => {
            try {
                if (!payload) return;

                const key = String(roomId);
                if (String(payload.roomId) !== key) return;

                setTypingUsers((prev) =>
                    prev.filter((u) => String(u.userId) !== String(payload.userId)),
                );
            } catch (error) {
                console.log("[CHAT] SERVER_STOP_TYPING handle error", error);
            }
        };

        const handleIncoming = (m: MessageDto) => {
            console.log("[CHAT] SERVER_SEND_MESSAGE received", {
                roomId: roomKey,
                meId,
                messageId: m._id,
            });

            setMessages((prev) => {
                if (prev.some((item) => item.id === m._id)) return prev;

                const createdAtText = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                    : "";

                const isDeleted = !!m.isDeleted;

                let replyTo: ChatMessage["replyTo"] | undefined;
                if (m.replyToMessage && !isDeleted) {
                    const parent = prev.find(
                        (msg) => String(msg.id) === String(m.replyToMessage),
                    );
                    if (parent) {
                        replyTo = {
                            id: parent.id,
                            content: parent.content,
                            senderId: parent.senderId,
                            isMine: parent.isMine,
                        };
                    }
                }

                const newMsg: ChatMessage = {
                    id: m._id,
                    content: isDeleted ? "Tin nhắn đã xoá" : m.content,
                    isMine: meId ? m.sender_id === meId : false,
                    senderId: m.sender_id,
                    createdAt: createdAtText,
                    kind: "normal",
                    images: isDeleted ? [] : m.images,
                    replyTo,
                    isDeleted,
                };

                return dedupeMessagesById([...prev, newMsg]);
            });
        };


        const handleNicknameChanged = (payload: NicknameChangedEvent) => {
            try {
                if (!payload || String(payload.roomId) !== roomKey) return;

                const { changerId, changerName, targetId, targetName, newNickname } =
                    payload;

                const meIdStr = meId ? String(meId) : null;
                const changerIdStr = changerId ? String(changerId) : null;
                const targetIdStr = String(targetId);

                const isMeChanger =
                    !!meIdStr && !!changerIdStr && meIdStr === changerIdStr;
                const isMeTarget = !!meIdStr && meIdStr === targetIdStr;

                const nicknameText = newNickname || "Chưa đặt biệt danh";

                let content: string;

                if (isMeChanger && isMeTarget) {
                    // Mình tự đổi biệt danh của mình
                    content = `Bạn đã thay đổi biệt danh của bạn thành "${nicknameText}"`;
                } else if (isMeChanger) {
                    // Mình đổi biệt danh của người khác
                    content = `Bạn đã thay đổi biệt danh của ${targetName} thành "${nicknameText}"`;
                } else if (isMeTarget) {
                    // Người khác đổi biệt danh của mình
                    content = `${changerName} đã thay đổi biệt danh của bạn thành "${nicknameText}"`;
                } else {
                    // Người khác đổi biệt danh của người khác
                    content = `${changerName} đã thay đổi biệt danh của ${targetName} thành "${nicknameText}"`;
                }

                const systemMsg: ChatMessage = {
                    id: `system-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    content,
                    isMine: false,
                    senderId: "system",
                    createdAt: new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    kind: "system",
                };

                setMessages((prev) => [...prev, systemMsg]);

                // Update room.users nickname in realtime
                setRoom((prev) => {
                    if (!prev || !Array.isArray(prev.users)) return prev;

                    const nextUsers = prev.users.map((u) => {
                        if (String(u.user_id) !== String(targetId)) return u;
                        return { ...u, nickname: newNickname };
                    });

                    return { ...prev, users: nextUsers };
                });
            } catch (e) {
                console.log("[CHAT] SERVER_NICKNAME_CHANGED handle error", e);
            }
        };

        const handleMessageDeleted = (payload: MessageDeletedEvent) => {
            try {
                if (!payload || String(payload.roomId) !== roomKey) return;

                const deleterId = String(payload.deletedBy);
                const meIdStr = meId ? String(meId) : null;

                const isMeDeleter = !!meIdStr && meIdStr === deleterId;

                const deleterMember = room?.users?.find(
                    (u) => String(u.user_id) === deleterId,
                );

                let content: string;
                if (isMeDeleter) {
                    content = "Bạn đã xoá một tin nhắn";
                } else {
                    const name = deleterMember?.nickname || "Một thành viên";
                    content = `${name} đã xoá một tin nhắn`;
                }

                const systemMsg: ChatMessage = {
                    id: `deleted-${payload.messageId}-${Date.now()}`,
                    content,
                    isMine: false,
                    senderId: "system",
                    createdAt: new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    kind: "system",
                };

                setMessages((prev) => {
                    const updated = prev.map((m) => {
                        if (String(m.id) !== String(payload.messageId)) return m;

                        return {
                            ...m,
                            isDeleted: true,
                            content: "Tin nhắn đã xoá",
                            images: [],
                        };
                    });

                    return [...updated, systemMsg];
                });
            } catch (e) {
                console.log("[CHAT] SERVER_MESSAGE_DELETED handle error", e);
            }
        };

        const handleMembersAdded = (payload: MembersAddedEvent) => {
            try {
                if (!payload || String(payload.roomId) !== roomKey) return;

                const meIdStr = meId ? String(meId) : null;
                const isMeAdder = !!meIdStr && payload.adderId && String(payload.adderId) === meIdStr;

                const names = Array.isArray(payload.members)
                    ? payload.members
                        .map((m) => m?.nickname)
                        .filter(Boolean)
                    : [];

                const suffix = names.length ? names.join(", ") : "thành viên mới";
                const adderName = payload.adderName || "Một thành viên";

                const content = isMeAdder
                    ? `Bạn đã thêm ${suffix} vào nhóm`
                    : `${adderName} đã thêm ${suffix} vào nhóm`;

                const systemMsg: ChatMessage = {
                    id: `members-added-${Date.now()}`,
                    content,
                    isMine: false,
                    senderId: "system",
                    createdAt: new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    kind: "system",
                };

                setMessages((prev) => [...prev, systemMsg]);

                // Update room.users so new members show correct avatar/nickname realtime
                if (Array.isArray(payload.members) && payload.members.length) {
                    setRoom((prev) => {
                        if (!prev) return prev;
                        const prevUsers = Array.isArray(prev.users) ? prev.users : [];

                        const byId = new Map(prevUsers.map((u) => [String(u.user_id), u]));

                        for (const m of payload.members || []) {
                            const id = String(m.userId);
                            if (!id) continue;
                            const existing = byId.get(id);
                            if (existing) {
                                byId.set(id, {
                                    ...existing,
                                    nickname: m.nickname ?? existing.nickname,
                                    avatar: m.avatar ?? existing.avatar,
                                    role: (m.role as any) ?? existing.role,
                                    deletedAt: undefined,
                                });
                            } else {
                                byId.set(id, {
                                    user_id: id,
                                    nickname: m.nickname || "",
                                    avatar: m.avatar,
                                    role: (m.role as any) || "member",
                                } as any);
                            }
                        }

                        return { ...prev, users: Array.from(byId.values()) };
                    });
                }
            } catch (e) {
                console.log("[CHAT] SERVER_MEMBERS_ADDED handle error", e);
            }
        };

        const roleLabel = (role?: string) => {
            if (role === "owner") return "Chủ nhóm";
            if (role === "co_owner") return "Phó nhóm";
            return "Thành viên";
        };

        const handleMemberRemoved = (payload: MemberRemovedEvent) => {
            try {
                if (!payload || String(payload.roomId) !== roomKey) return;

                const meIdStr = meId ? String(meId) : null;
                const changerIdStr = payload.changerId ? String(payload.changerId) : null;
                const targetIdStr = String(payload.targetId);

                const isMeChanger = !!meIdStr && !!changerIdStr && meIdStr === changerIdStr;
                const isMeTarget = !!meIdStr && meIdStr === targetIdStr;

                const changerName = payload.changerName || "Một thành viên";
                const targetName =
                    payload.targetName ||
                    room?.users?.find((u) => String(u.user_id) === targetIdStr)?.nickname ||
                    "một thành viên";

                let content: string;
                if (isMeTarget) {
                    content = isMeChanger
                        ? "Bạn đã rời khỏi nhóm"
                        : `${changerName} đã xoá bạn khỏi nhóm`;
                } else {
                    content = isMeChanger
                        ? `Bạn đã xoá ${targetName} khỏi nhóm`
                        : `${changerName} đã xoá ${targetName} khỏi nhóm`;
                }

                const systemMsg: ChatMessage = {
                    id: `member-removed-${Date.now()}`,
                    content,
                    isMine: false,
                    senderId: "system",
                    createdAt: new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    kind: "system",
                };

                setMessages((prev) => [...prev, systemMsg]);

                // Update room state (remove member)
                setRoom((prev) => {
                    if (!prev || !Array.isArray(prev.users)) return prev;
                    return {
                        ...prev,
                        users: prev.users.filter((u) => String(u.user_id) !== targetIdStr),
                    };
                });
            } catch (e) {
                console.log("[CHAT] SERVER_MEMBER_REMOVED handle error", e);
            }
        };

        const handleMemberRoleChanged = (payload: MemberRoleChangedEvent) => {
            try {
                if (!payload || String(payload.roomId) !== roomKey) return;

                const meIdStr = meId ? String(meId) : null;
                const changerIdStr = payload.changerId ? String(payload.changerId) : null;
                const isMeChanger = !!meIdStr && !!changerIdStr && meIdStr === changerIdStr;

                const changes = Array.isArray(payload.changes) && payload.changes.length
                    ? payload.changes
                    : payload.targetId && payload.newRole
                        ? [{ userId: String(payload.targetId), newRole: String(payload.newRole) }]
                        : [];

                if (!changes.length) return;

                // Update room users roles
                setRoom((prev) => {
                    if (!prev || !Array.isArray(prev.users)) return prev;

                    const nextUsers = prev.users.map((u) => {
                        const found = changes.find((c) => String(c.userId) === String(u.user_id));
                        if (!found) return u;
                        return { ...u, role: found.newRole };
                    });

                    return { ...prev, users: nextUsers };
                });

                // Compose system notice (focus on the primary/target change)
                const primary = changes[0];
                const targetIdStr = String(primary.userId);
                const targetName =
                    payload.targetName ||
                    room?.users?.find((u) => String(u.user_id) === targetIdStr)?.nickname ||
                    "một thành viên";
                const changerName = payload.changerName || "Một thành viên";

                const isMeTarget = !!meIdStr && meIdStr === targetIdStr;
                const label = roleLabel(primary.newRole);

                let content: string;
                if (isMeTarget && isMeChanger) {
                    content = `Bạn đã trở thành ${label}`;
                } else if (isMeChanger) {
                    content = `Bạn đã đổi quyền của ${targetName} thành ${label}`;
                } else if (isMeTarget) {
                    content = `${changerName} đã đổi quyền của bạn thành ${label}`;
                } else {
                    content = `${changerName} đã đổi quyền của ${targetName} thành ${label}`;
                }

                const systemMsg: ChatMessage = {
                    id: `role-changed-${Date.now()}`,
                    content,
                    isMine: false,
                    senderId: "system",
                    createdAt: new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    kind: "system",
                };

                setMessages((prev) => [...prev, systemMsg]);
            } catch (e) {
                console.log("[CHAT] SERVER_MEMBER_ROLE_CHANGED handle error", e);
            }
        };

        const handleRoomTitleChanged = (payload: RoomTitleChangedEvent) => {
            try {
                if (!payload || String(payload.roomId) !== roomKey) return;

                const meIdStr = meId ? String(meId) : null;
                const changerIdStr = payload.changerId ? String(payload.changerId) : null;
                const isMeChanger = !!meIdStr && !!changerIdStr && meIdStr === changerIdStr;

                setRoom((prev) => {
                    if (!prev) return prev;
                    return { ...prev, title: payload.newTitle as any };
                });

                const changerName = payload.changerName || "Một thành viên";
                const content = isMeChanger
                    ? `Bạn đã đổi tên nhóm thành "${payload.newTitle}"`
                    : `${changerName} đã đổi tên nhóm thành "${payload.newTitle}"`;

                const systemMsg: ChatMessage = {
                    id: `title-changed-${Date.now()}`,
                    content,
                    isMine: false,
                    senderId: "system",
                    createdAt: new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    kind: "system",
                };

                setMessages((prev) => [...prev, systemMsg]);
            } catch (e) {
                console.log("[CHAT] SERVER_ROOM_TITLE_CHANGED handle error", e);
            }
        };

        const handleRoomAvatarChanged = (payload: RoomAvatarChangedEvent) => {
            try {
                if (!payload || String(payload.roomId) !== roomKey) return;

                const meIdStr = meId ? String(meId) : null;
                const changerIdStr = payload.changerId ? String(payload.changerId) : null;
                const isMeChanger = !!meIdStr && !!changerIdStr && meIdStr === changerIdStr;

                setRoom((prev) => {
                    if (!prev) return prev;
                    return { ...prev, avatar: payload.newAvatar as any };
                });

                const changerName = payload.changerName || "Một thành viên";
                const content = isMeChanger
                    ? "Bạn đã thay đổi ảnh đại diện nhóm"
                    : `${changerName} đã thay đổi ảnh đại diện nhóm`;

                const systemMsg: ChatMessage = {
                    id: `avatar-changed-${Date.now()}`,
                    content,
                    isMine: false,
                    senderId: "system",
                    createdAt: new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    kind: "system",
                };

                setMessages((prev) => [...prev, systemMsg]);
            } catch (e) {
                console.log("[CHAT] SERVER_ROOM_AVATAR_CHANGED handle error", e);
            }
        };

        // Tham gia room và lắng nghe sự kiện, gửi kèm userId để backend kiểm tra
        console.log("[CHAT] JOIN_ROOM emit", { roomId: roomKey, userId: meId });
        socket.emit("JOIN_ROOM", { roomId: roomKey, userId: meId });
        console.log("[CHAT] Register SERVER_SEND_MESSAGE listener");
        socket.on("SERVER_SEND_MESSAGE", handleIncoming);
        socket.on("SERVER_NICKNAME_CHANGED", handleNicknameChanged);
        socket.on("SERVER_MEMBERS_ADDED", handleMembersAdded);
        socket.on("SERVER_MEMBER_REMOVED", handleMemberRemoved);
        socket.on("SERVER_MEMBER_ROLE_CHANGED", handleMemberRoleChanged);
        socket.on("SERVER_ROOM_TITLE_CHANGED", handleRoomTitleChanged);
        socket.on("SERVER_ROOM_AVATAR_CHANGED", handleRoomAvatarChanged);
        socket.on("SERVER_TYPING", handleTyping);
        socket.on("SERVER_STOP_TYPING", handleStopTyping);
        socket.on("SERVER_MESSAGE_DELETED", handleMessageDeleted);

        return () => {
            console.log("[CHAT] Cleanup SERVER_SEND_MESSAGE listener", {
                roomId: roomKey,
                meId,
            });
            socket.off("SERVER_SEND_MESSAGE", handleIncoming);
            socket.off("SERVER_NICKNAME_CHANGED", handleNicknameChanged);
            socket.off("SERVER_MEMBERS_ADDED", handleMembersAdded);
            socket.off("SERVER_MEMBER_REMOVED", handleMemberRemoved);
            socket.off("SERVER_MEMBER_ROLE_CHANGED", handleMemberRoleChanged);
            socket.off("SERVER_ROOM_TITLE_CHANGED", handleRoomTitleChanged);
            socket.off("SERVER_ROOM_AVATAR_CHANGED", handleRoomAvatarChanged);
            socket.off("SERVER_TYPING", handleTyping);
            socket.off("SERVER_STOP_TYPING", handleStopTyping);
            socket.off("SERVER_MESSAGE_DELETED", handleMessageDeleted);

            // Khi rời màn chat, gửi stop typing nếu đang ở trạng thái typing
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }

            if (roomKey && meId && isTypingRef.current) {
                socket.emit("CLIENT_STOP_TYPING", {
                    roomId: roomKey,
                    userId: meId,
                });
            }

            isTypingRef.current = false;
            setTypingUsers([]);
        };
    }, [roomId, meId]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !roomId || sending) return;

        try {
            // Khi gửi tin nhắn thì dừng trạng thái đang nhập
            const roomKey = String(roomId);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }

            if (roomKey && meId && isTypingRef.current) {
                socket.emit("CLIENT_STOP_TYPING", {
                    roomId: roomKey,
                    userId: meId,
                });
            }
            isTypingRef.current = false;

            const replyToMessageId = replyTarget?.id;

            // Khi mình gửi tin nhắn thì luôn muốn cuộn xuống cuối
            shouldAutoScrollRef.current = true;
            setSending(true);
            const res = await chatService.sendMessage(String(roomId), text, {
                replyToMessageId,
            });
            const m = res.data?.message;
            if (!m) return;

            // Không thêm trực tiếp vào state ở đây để tránh trùng với message
            // được gửi lại từ socket SERVER_SEND_MESSAGE. UI sẽ được cập nhật
            // duy nhất bởi sự kiện socket, đảm bảo mỗi tin nhắn chỉ hiển thị một lần.
            setInput("");
            setReplyTarget(null);
        } finally {
            setSending(false);
        }
    };

    const handlePickImage = useCallback(async () => {
        if (!roomId || sendingImage) return;

        try {
            setSendingImage(true);

            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const uris = result.assets
                .map((asset) => asset.uri)
                .filter((uri): uri is string => !!uri);

            if (uris.length === 0) return;

            shouldAutoScrollRef.current = true;
            await chatService.sendImage(String(roomId), uris);
        } finally {
            setSendingImage(false);
        }
    }, [roomId, sendingImage]);

    const renderItem = ({ item }: { item: ChatMessage }) => {
        if (item.kind === "system") {
            return (
                <View style={styles.systemMessageRow}>
                    <Text style={styles.systemMessageText}>{item.content}</Text>
                </View>
            );
        }

        const sender: RoomUser | undefined =
            !item.isMine && room?.users
                ? room.users.find((u) => String(u.user_id) === String(item.senderId))
                : undefined;

        return (
            <Pressable
                onLongPress={() => {
                    setSelectedMessage(item);
                    setActionSheetVisible(true);
                }}
                delayLongPress={250}
            >
                <View
                    style={[
                        styles.messageRow,
                        item.isMine ? styles.messageRowMine : styles.messageRowOther,
                    ]}
                >
                    {!item.isMine && (
                        <View style={styles.messageAvatarWrap}>
                            {sender?.avatar ? (
                                <Image
                                    source={{ uri: sender.avatar }}
                                    style={styles.messageAvatar}
                                />
                            ) : (
                                <View style={styles.messageAvatarFallback}>
                                    <Text style={styles.messageAvatarInitial}>
                                        {(sender?.nickname || "?")
                                            .charAt(0)
                                            .toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                    <View
                        style={[
                            styles.messageBubble,
                            item.isMine
                                ? styles.messageBubbleMine
                                : styles.messageBubbleOther,
                        ]}
                    >
                        {item.replyTo && (
                            <View style={styles.replyPreview}>
                                <Text style={styles.replyPreviewLabel}>Trả lời</Text>
                                <Text
                                    style={styles.replyPreviewContent}
                                    numberOfLines={1}
                                >
                                    {item.replyTo.content}
                                </Text>
                            </View>
                        )}
                        {item.images && item.images.length > 0 && (
                            <View style={styles.messageImagesWrap}>
                                {item.images.map((url, index) => (
                                    <Image
                                        key={`${url}-${index}`}
                                        source={{ uri: url }}
                                        style={styles.messageImage}
                                    />
                                ))}
                            </View>
                        )}
                        {item.content ? (
                            <Text
                                style={[
                                    styles.messageText,
                                    item.isMine && styles.messageTextMine,
                                ]}
                            >
                                {item.content}
                            </Text>
                        ) : null}
                        {item.createdAt ? (
                            <View style={styles.messageTimeRow}>
                                <Text
                                    style={[
                                        styles.messageTime,
                                        item.isMine && styles.messageTimeMine,
                                    ]}
                                >
                                    {item.createdAt}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </Pressable>
        );
    };

    const otherMembers: RoomUser[] = room?.users
        ? room.users
            .filter((u) => (meId ? u.user_id !== meId : true))
            // Lọc bỏ các thành viên trùng user_id để tránh key bị trùng
            .filter(
                (u, index, arr) =>
                    index === arr.findIndex((x) => String(x.user_id) === String(u.user_id)),
            )
        : [];

    const otherUser: RoomUser | undefined =
        room?.typeRoom === "friend"
            ? otherMembers[0] ?? room.users?.[0]
            : undefined;

    const isGroup = room?.typeRoom === "group";

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.replace("/(tabs)/chat")}
                >
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </Pressable>
                <Pressable
                    style={styles.headerTitleWrap}
                    onPress={() => {
                        if (!roomId) return;

                        const params: Record<string, string> = {
                            roomId: String(roomId),
                            name: title,
                        };

                        if (otherUser?.user_id) {
                            params.userId = String(otherUser.user_id);
                        }

                        router.push({
                            pathname: "/(chats)/chat-manage",
                            params,
                        });
                    }}
                >
                    <View style={styles.headerTitleRow}>
                        {isGroup ? (
                            room?.avatar ? (
                                <Image
                                    source={{ uri: String(room.avatar) }}
                                    style={styles.headerAvatar}
                                />
                            ) : (
                                <View style={styles.headerAvatarFallback}>
                                    <Ionicons
                                        name="people-outline"
                                        size={18}
                                        color="#6b7280"
                                    />
                                </View>
                            )
                        ) : otherUser ? (
                            otherUser.avatar ? (
                                <Image
                                    source={{ uri: otherUser.avatar }}
                                    style={styles.headerAvatar}
                                />
                            ) : (
                                <View style={styles.headerAvatarFallback}>
                                    <Text style={styles.headerAvatarInitial}>
                                        {otherUser.nickname
                                            .charAt(0)
                                            .toUpperCase()}
                                    </Text>
                                </View>
                            )
                        ) : null}
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {title}
                        </Text>
                    </View>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            >
                <View style={styles.messagesContainer}>
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : messages.length === 0 ? (
                        <View style={styles.emptyRoomWrap}>
                            {isGroup && room ? (
                                <>
                                    <View style={styles.groupHeaderEmpty}>
                                        <View style={styles.groupAvatarEmpty}>
                                            {room.avatar ? (
                                                <Image
                                                    source={{ uri: String(room.avatar) }}
                                                    style={styles.groupAvatarImage}
                                                />
                                            ) : (
                                                <Ionicons
                                                    name="people-outline"
                                                    size={24}
                                                    color="#6b7280"
                                                />
                                            )}
                                        </View>
                                        <Text style={styles.emptyTitle} numberOfLines={1}>
                                            {String(room.title || name || "Nhóm chat")}
                                        </Text>
                                    </View>
                                    {otherMembers.length > 0 ? (
                                        <View style={styles.membersRowEmpty}>
                                            {otherMembers.map((m) => (
                                                <View
                                                    key={m.user_id}
                                                    style={styles.memberAvatarSmall}
                                                >
                                                    {m.avatar ? (
                                                        <Image
                                                            source={{ uri: m.avatar }}
                                                            style={styles.memberAvatarImage}
                                                        />
                                                    ) : (
                                                        <Text style={styles.memberAvatarInitial}>
                                                            {m.nickname.charAt(0).toUpperCase()}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    ) : null}
                                    {otherMembers.length > 0 ? (
                                        <Text style={styles.emptySubtitle}>
                                            {`Bạn đã thêm ${otherMembers
                                                .map((m) => m.nickname)
                                                .join(", ")} vào nhóm`}
                                        </Text>
                                    ) : null}
                                </>
                            ) : otherUser ? (
                                <>
                                    <View style={styles.otherUserHeaderEmpty}>
                                        {otherUser.avatar ? (
                                            <Image
                                                source={{ uri: otherUser.avatar }}
                                                style={styles.otherUserAvatarImage}
                                            />
                                        ) : (
                                            <View style={styles.otherUserAvatarFallback}>
                                                <Text style={styles.otherUserAvatarInitial}>
                                                    {otherUser.nickname
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.emptyTitle} numberOfLines={1}>
                                            {otherUser.nickname}
                                        </Text>
                                    </View>
                                    <Text style={styles.emptySubtitle}>
                                        Bắt đầu cuộc trò chuyện với {otherUser.nickname}
                                    </Text>
                                    <Pressable
                                        style={styles.profileButton}
                                        onPress={() => {
                                            if (!otherUser?.user_id) return;

                                            router.push({
                                                pathname: "/users/[userId]",
                                                params: { userId: String(otherUser.user_id) },
                                            });
                                        }}
                                    >
                                        <Text style={styles.profileButtonText}>
                                            Xem trang cá nhân
                                        </Text>
                                    </Pressable>
                                </>
                            ) : null}
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item, index) => `${item.id}-${index}`}
                            renderItem={renderItem}
                            contentContainerStyle={styles.messagesContent}
                            ListHeaderComponent={
                                loadingMore ? (
                                    <View style={styles.loadMoreIndicator}>
                                        <ActivityIndicator size="small" color="#6b7280" />
                                    </View>
                                ) : null
                            }
                            onScroll={({ nativeEvent }) => {
                                const { contentOffset, layoutMeasurement, contentSize } =
                                    nativeEvent;

                                // Load thêm tin nhắn cũ khi kéo lên đỉnh
                                if (contentOffset.y <= 0 && !loadingMore && hasMore) {
                                    void loadMoreMessages();
                                }

                                // Cập nhật trạng thái đang ở gần cuối hay không
                                const distanceFromBottom =
                                    contentSize.height -
                                    (contentOffset.y + layoutMeasurement.height);
                                const isNearBottom = distanceFromBottom < 40;
                                shouldAutoScrollRef.current = isNearBottom;
                            }}
                            scrollEventThrottle={16}
                            onContentSizeChange={() => {
                                // Chỉ auto scroll khi:
                                // - không phải đang load tin nhắn cũ
                                // - đang ở gần cuối (hoặc vừa vào phòng / vừa gửi tin)
                                if (!loadingMore && shouldAutoScrollRef.current) {
                                    flatListRef.current?.scrollToEnd({ animated: true });
                                }
                            }}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                            }
                            initialNumToRender={15}
                            maxToRenderPerBatch={20}
                            removeClippedSubviews={true}
                            windowSize={7}
                        />
                    )}
                </View>

                {typingUsers.length > 0 && (
                    <View style={styles.typingIndicatorRow}>
                        <Text style={styles.typingIndicatorText}>
                            {typingUsers.length === 1
                                ? `${typingUsers[0].name || "Ai đó"} đang nhập...`
                                : "Nhiều người đang nhập..."}
                        </Text>
                    </View>
                )}

                {replyTarget && (
                    <View style={styles.replyingToRow}>
                        <View style={styles.replyingToContent}>
                            <Text style={styles.replyingToLabel}>Đang trả lời</Text>
                            <Text
                                style={styles.replyingToText}
                                numberOfLines={1}
                            >
                                {replyTarget.content}
                            </Text>
                        </View>
                        <Pressable
                            style={styles.replyingToClose}
                            onPress={() => setReplyTarget(null)}
                        >
                            <Ionicons name="close" size={16} color="#6b7280" />
                        </Pressable>
                    </View>
                )}

                <View style={styles.inputRow}>
                    <View style={styles.inputActions}>
                        <Pressable
                            style={styles.iconButton}
                            onPress={() => {
                                // TODO: mở popup chọn emoji
                            }}
                        >
                            <Ionicons name="happy-outline" size={22} color="#6b7280" />
                        </Pressable>
                        <Pressable
                            style={styles.iconButton}
                            onPress={() => {
                                void handlePickImage();
                            }}
                        >
                            <Ionicons name="image-outline" size={22} color="#6b7280" />
                        </Pressable>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Nhắn tin..."
                        placeholderTextColor="#9ca3af"
                        value={input}
                        onChangeText={(text) => {
                            setInput(text);

                            if (!roomId || !meId) return;

                            const roomKey = String(roomId);

                            if (!isTypingRef.current) {
                                isTypingRef.current = true;
                                socket.emit("CLIENT_TYPING", {
                                    roomId: roomKey,
                                    userId: meId,
                                    name:
                                        (user as any)?.fullName ||
                                        (user as any)?.name ||
                                        (user as any)?.username ||
                                        "Người dùng",
                                });
                            }

                            if (typingTimeoutRef.current) {
                                clearTimeout(typingTimeoutRef.current);
                            }

                            typingTimeoutRef.current = setTimeout(() => {
                                if (!roomKey || !meId) return;

                                socket.emit("CLIENT_STOP_TYPING", {
                                    roomId: roomKey,
                                    userId: meId,
                                });

                                isTypingRef.current = false;
                                typingTimeoutRef.current = null;
                            }, 800);
                        }}
                        multiline
                    />

                    <Pressable
                        style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!input.trim() || sending}
                    >
                        <Ionicons name="send" size={18} color="#fff" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={actionSheetVisible}
                animationType="fade"
                transparent
                onRequestClose={() => {
                    if (!deletingMessage) {
                        setActionSheetVisible(false);
                        setSelectedMessage(null);
                    }
                }}
            >
                <TouchableOpacity
                    style={styles.actionSheetOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        if (!deletingMessage) {
                            setActionSheetVisible(false);
                            setSelectedMessage(null);
                        }
                    }}
                >
                    <View style={styles.actionSheetContainer}>
                        {selectedMessage?.content && !selectedMessage?.isDeleted ? (
                            <Pressable
                                style={styles.actionSheetOption}
                                onPress={async () => {
                                    if (!selectedMessage?.content) return;
                                    try {
                                        await Clipboard.setStringAsync(
                                            selectedMessage.content,
                                        );
                                    } finally {
                                        setActionSheetVisible(false);
                                        setSelectedMessage(null);
                                    }
                                }}
                            >
                                <Text style={styles.actionSheetOptionText}>Sao chép</Text>
                            </Pressable>
                        ) : null}

                        {selectedMessage && !selectedMessage.isDeleted ? (
                            <Pressable
                                style={styles.actionSheetOption}
                                onPress={() => {
                                    setReplyTarget(selectedMessage);
                                    setActionSheetVisible(false);
                                    // không reset selectedMessage để vẫn biết đang trả lời tin nào nếu cần
                                }}
                            >
                                <Text style={styles.actionSheetOptionText}>Trả lời</Text>
                            </Pressable>
                        ) : null}

                        {selectedMessage?.isMine && !selectedMessage?.isDeleted ? (
                            <Pressable
                                style={styles.actionSheetOptionDanger}
                                disabled={deletingMessage}
                                onPress={async () => {
                                    if (!roomId || !selectedMessage) return;

                                    try {
                                        setDeletingMessage(true);
                                        await chatService.deleteMessage(
                                            String(roomId),
                                            selectedMessage.id,
                                        );
                                    } finally {
                                        setDeletingMessage(false);
                                        setActionSheetVisible(false);
                                        setSelectedMessage(null);
                                    }
                                }}
                            >
                                <Text style={styles.actionSheetOptionDangerText}>
                                    {deletingMessage ? "Đang xoá..." : "Xoá tin nhắn"}
                                </Text>
                            </Pressable>
                        ) : null}

                        <Pressable
                            style={styles.actionSheetOptionCancel}
                            onPress={() => {
                                if (!deletingMessage) {
                                    setActionSheetVisible(false);
                                    setSelectedMessage(null);
                                }
                            }}
                        >
                            <Text style={styles.actionSheetOptionCancelText}>Huỷ</Text>
                        </Pressable>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    flex: {
        flex: 1,
    },
    header: {
        height: 52,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#e5e5e5",
    },
    backButton: {
        paddingRight: 8,
        paddingVertical: 4,
        marginRight: 4,
    },
    headerTitleWrap: {
        flex: 1,
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#111",
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 4,
    },
    headerAvatarFallback: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 4,
    },
    headerAvatarInitial: {
        fontSize: 14,
        fontWeight: "700",
        color: "#4b5563",
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
    },
    loadingWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loadMoreIndicator: {
        paddingVertical: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyRoomWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    emptyTitle: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: "600",
        color: "#111",
        textAlign: "center",
    },
    emptySubtitle: {
        marginTop: 6,
        fontSize: 13,
        color: "#6b7280",
        textAlign: "center",
    },
    otherUserHeaderEmpty: {
        alignItems: "center",
    },
    otherUserAvatarImage: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    otherUserAvatarFallback: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
    },
    otherUserAvatarInitial: {
        fontSize: 28,
        fontWeight: "700",
        color: "#4b5563",
    },
    profileButton: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#d1d5db",
    },
    profileButtonText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#111",
    },
    groupHeaderEmpty: {
        alignItems: "center",
    },
    groupAvatarEmpty: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
    },
    groupAvatarImage: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    membersRowEmpty: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
    },
    memberAvatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 3,
    },
    memberAvatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    memberAvatarInitial: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4b5563",
    },
    systemMessageRow: {
        marginVertical: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    systemMessageText: {
        fontSize: 12,
        color: "#6b7280",
        textAlign: "center",
    },
    messageRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    messageRowMine: {
        justifyContent: "flex-end",
    },
    messageRowOther: {
        justifyContent: "flex-start",
    },
    messageBubble: {
        maxWidth: "78%",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
        marginBottom: 2,
    },
    messageBubbleMine: {
        backgroundColor: "#2563eb",
        alignSelf: "flex-end",
    },
    messageBubbleOther: {
        backgroundColor: "#f3f4f6",
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    messageAvatarWrap: {
        marginRight: 8,
        alignSelf: "flex-end",
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.10,
        shadowRadius: 3,
        elevation: 2,
    },
    messageAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: "#fff",
    },
    messageAvatarFallback: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#e0e7ef",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#fff",
    },
    messageAvatarInitial: {
        fontSize: 16,
        fontWeight: "700",
        color: "#64748b",
    },
    messageImagesWrap: {
        marginTop: 6,
        flexDirection: 'row',
        gap: 8,
    },
    messageImage: {
        width: 140,
        height: 140,
        borderRadius: 14,
        backgroundColor: "#e0e7ef",
        marginRight: 4,
    },
    messageTimeRow: {
        alignSelf: "flex-end",
        marginTop: 4,
    },
    messageText: {
        fontSize: 15,
        color: "#22223b",
        lineHeight: 22,
    },
    messageTextMine: {
        color: "#fff",
    },
    messageTime: {
        fontSize: 11,
        color: "#a0aec0",
        textAlign: "right",
    },
    messageTimeMine: {
        color: "#e0e7ef",
    },
    replyPreview: {
        borderLeftWidth: 2,
        borderLeftColor: "#9ca3af",
        paddingLeft: 6,
        marginBottom: 4,
    },
    replyPreviewLabel: {
        fontSize: 11,
        color: "#6b7280",
        marginBottom: 2,
    },
    replyPreviewContent: {
        fontSize: 13,
        color: "#111827",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: 0,
        backgroundColor: "#f8fafc",
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    inputActions: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 6,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 4,
        backgroundColor: '#f1f5f9',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#fff",
        fontSize: 15,
        marginRight: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    sendButton: {
        marginLeft: 4,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#2563eb",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
    },
    sendButtonDisabled: {
        backgroundColor: "#cbd5e1",
    },
    typingIndicatorRow: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    typingIndicatorText: {
        fontSize: 12,
        color: "#6b7280",
        fontStyle: "italic",
    },
    replyingToRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
    },
    replyingToContent: {
        flex: 1,
        marginRight: 8,
    },
    replyingToLabel: {
        fontSize: 11,
        color: "#6b7280",
        marginBottom: 2,
    },
    replyingToText: {
        fontSize: 13,
        color: "#111827",
    },
    replyingToClose: {
        padding: 4,
    },
    actionSheetOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "flex-end",
    },
    actionSheetContainer: {
        backgroundColor: "#f9fafb",
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    actionSheetOption: {
        paddingVertical: 12,
    },
    actionSheetOptionText: {
        fontSize: 15,
        color: "#111827",
        textAlign: "center",
    },
    actionSheetOptionDanger: {
        paddingVertical: 12,
    },
    actionSheetOptionDangerText: {
        fontSize: 15,
        color: "#dc2626",
        textAlign: "center",
        fontWeight: "600",
    },
    actionSheetOptionCancel: {
        marginTop: 4,
        paddingVertical: 12,
    },
    actionSheetOptionCancelText: {
        fontSize: 15,
        color: "#111827",
        textAlign: "center",
    },
});
