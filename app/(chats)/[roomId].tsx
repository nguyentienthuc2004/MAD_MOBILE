import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

    const meId = user?._id ?? null;

    const title = useMemo(() => {
        return name || "Đoạn chat";
    }, [name]);

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

                const mapped: ChatMessage[] = [...uniqueMessages]
                    .reverse()
                    .map((m) => ({
                        id: m._id,
                        content: m.content,
                        isMine: meId ? m.sender_id === meId : false,
                        createdAt: m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : "",
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
                createdAt: createdAtText,
            };

            setMessages((prev) => {
                // Tránh thêm trùng tin nhắn nếu đã có
                if (prev.some((item) => item.id === newMsg.id)) return prev;
                return dedupeMessagesById([...prev, newMsg]);
            });
        };


        // Tham gia room và lắng nghe sự kiện, gửi kèm userId để backend kiểm tra
        console.log("[CHAT] JOIN_ROOM emit", { roomId: roomKey, userId: meId });
        socket.emit("JOIN_ROOM", { roomId: roomKey, userId: meId });
        console.log("[CHAT] Register SERVER_SEND_MESSAGE listener");
        socket.on("SERVER_SEND_MESSAGE", handleIncoming);

        return () => {
            console.log("[CHAT] Cleanup SERVER_SEND_MESSAGE listener", {
                roomId: roomKey,
                meId,
            });
            socket.off("SERVER_SEND_MESSAGE", handleIncoming);
        };
    }, [roomId, meId]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !roomId || sending) return;

        try {
            setSending(true);
            const res = await chatService.sendMessage(String(roomId), text);
            const m = res.data?.message;
            if (!m) return;

            // Không thêm trực tiếp vào state ở đây để tránh trùng với message
            // được gửi lại từ socket SEVER_SEND_MESSAGE. UI sẽ được cập nhật
            // duy nhất bởi sự kiện socket, đảm bảo mỗi tin nhắn chỉ hiển thị một lần.
            setInput("");
        } finally {
            setSending(false);
        }
    };

    const renderItem = ({ item }: { item: ChatMessage }) => {
        return (
            <View
                style={[
                    styles.messageRow,
                    item.isMine ? styles.messageRowMine : styles.messageRowOther,
                ]}
            >
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
                        <Text
                            style={[
                                styles.messageTime,
                                item.isMine && styles.messageTimeMine,
                            ]}
                        >
                            {item.createdAt}
                        </Text>
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
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {title}
                </Text>
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
                                            // TODO: điều hướng sang trang cá nhân khi có màn user profile
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
                            data={messages}
                            keyExtractor={(item, index) => `${item.id}-${index}`}
                            renderItem={renderItem}
                            contentContainerStyle={styles.messagesContent}
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
    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#111",
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
        marginTop: 2,
        textAlign: "right",
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
