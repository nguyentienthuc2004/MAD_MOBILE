import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
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
};

type NicknameChangedEvent = {
    roomId: string;
    changerId?: string;
    changerName: string;
    targetId: string;
    targetName: string;
    newNickname: string;
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
    const { roomId, name } = useLocalSearchParams<{ roomId: string; name?: string }>();
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

    const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
    const shouldAutoScrollRef = useRef<boolean>(true);

    const meId = user?._id ?? null;

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

                // Cập nhật cursor và trạng thái còn tin nhắn cũ hay không
                if (uniqueMessages.length > 0) {
                    const oldest = uniqueMessages[uniqueMessages.length - 1];
                    setOldestCursor(oldest.createdAt ?? null);
                    // Nếu lấy đủ 20 tin thì có thể còn, nếu ít hơn thì coi như hết
                    setHasMore(uniqueMessages.length >= 20);
                } else {
                    setOldestCursor(null);
                    setHasMore(false);
                }

                const mapped: ChatMessage[] = [...uniqueMessages]
                    .reverse()
                    .map((m) => ({
                        id: m._id,
                        content: m.content,
                        isMine: meId ? m.sender_id === meId : false,
                        senderId: m.sender_id,
                        createdAt: m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : "",
                        kind: "normal",
                    }));

                setMessages(dedupeMessagesById(mapped));
            } catch {
                // có thể hiển thị toast / alert sau
            } finally {
                if (!options?.silent) {
                    setLoading(false);
                }
            }
        },
        [meId, roomId],
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

            const mapped: ChatMessage[] = [...uniqueMessages]
                .reverse()
                .map((m) => ({
                    id: m._id,
                    content: m.content,
                    isMine: meId ? m.sender_id === meId : false,
                    senderId: m.sender_id,
                    createdAt: m.createdAt
                        ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : "",
                    kind: "normal",
                }));

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

        const handleIncoming = (m: MessageDto) => {
            console.log("[CHAT] SERVER_SEND_MESSAGE received", {
                roomId: roomKey,
                meId,
                messageId: m._id,
            });

            const createdAtText = m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                })
                : "";

            const newMsg: ChatMessage = {
                id: m._id,
                content: m.content,
                isMine: meId ? m.sender_id === meId : false,
                senderId: m.sender_id,
                createdAt: createdAtText,
                kind: "normal",
            };

            setMessages((prev) => {
                // Tránh thêm trùng tin nhắn nếu đã có
                if (prev.some((item) => item.id === newMsg.id)) return prev;
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
            } catch (e) {
                console.log("[CHAT] SERVER_NICKNAME_CHANGED handle error", e);
            }
        };

        // Tham gia room và lắng nghe sự kiện, gửi kèm userId để backend kiểm tra
        console.log("[CHAT] JOIN_ROOM emit", { roomId: roomKey, userId: meId });
        socket.emit("JOIN_ROOM", { roomId: roomKey, userId: meId });
        console.log("[CHAT] Register SERVER_SEND_MESSAGE listener");
        socket.on("SERVER_SEND_MESSAGE", handleIncoming);
        socket.on("SERVER_NICKNAME_CHANGED", handleNicknameChanged);

        return () => {
            console.log("[CHAT] Cleanup SERVER_SEND_MESSAGE listener", {
                roomId: roomKey,
                meId,
            });
            socket.off("SERVER_SEND_MESSAGE", handleIncoming);
            socket.off("SERVER_NICKNAME_CHANGED", handleNicknameChanged);
        };
    }, [roomId, meId]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !roomId || sending) return;

        try {
            // Khi mình gửi tin nhắn thì luôn muốn cuộn xuống cuối
            shouldAutoScrollRef.current = true;
            setSending(true);
            const res = await chatService.sendMessage(String(roomId), text);
            const m = res.data?.message;
            if (!m) return;

            // Không thêm trực tiếp vào state ở đây để tránh trùng với message
            // được gửi lại từ socket SERVER_SEND_MESSAGE. UI sẽ được cập nhật
            // duy nhất bởi sự kiện socket, đảm bảo mỗi tin nhắn chỉ hiển thị một lần.
            setInput("");
        } finally {
            setSending(false);
        }
    };

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
                        item.isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
                    ]}
                >
                    <Text
                        style={[
                            styles.messageText,
                            item.isMine && styles.messageTextMine,
                        ]}
                    >
                        {item.content}
                    </Text>
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
                <Pressable style={styles.backButton} onPress={() => router.back()}>
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
                        />
                    )}
                </View>

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
                                // TODO: mở thư viện ảnh để gửi ảnh
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
                        onChangeText={setInput}
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
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    messageBubbleMine: {
        backgroundColor: "#0a84ff",
    },
    messageBubbleOther: {
        backgroundColor: "#e5e5ea",
    },
    messageAvatarWrap: {
        marginRight: 6,
        alignSelf: "flex-end",
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#e5e7eb",
    },
    messageAvatarFallback: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
    },
    messageAvatarInitial: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4b5563",
    },
    messageTimeRow: {
        alignSelf: "flex-start",
        marginTop: 2,
    },
    messageText: {
        fontSize: 15,
        color: "#111",
    },
    messageTextMine: {
        color: "#fff",
    },
    messageTime: {
        fontSize: 11,
        color: "#9ca3af",
        textAlign: "left",
    },
    messageTimeMine: {
        color: "#d1d5db",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#e5e5e5",
        backgroundColor: "#fff",
    },
    inputActions: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 6,
    },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 2,
    },
    input: {
        flex: 1,
        minHeight: 36,
        maxHeight: 100,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: "#f3f4f6",
        fontSize: 14,
    },
    sendButton: {
        marginLeft: 8,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#0a84ff",
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonDisabled: {
        backgroundColor: "#9ca3af",
    },
});
