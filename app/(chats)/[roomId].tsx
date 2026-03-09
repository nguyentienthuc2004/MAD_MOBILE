import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { chatService, type MessageDto } from "@/services/chat.service";
import { useAuth } from "@/stores/auth.store";

type ChatMessage = {
    id: string;
    content: string;
    isMine: boolean;
    createdAt: string;
};

export default function ChatRoomScreen() {
    const router = useRouter();
    const { roomId, name } = useLocalSearchParams<{ roomId: string; name?: string }>();
    const { user } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [input, setInput] = useState("");

    const meId = user?._id ?? null;

    const title = useMemo(() => {
        return name || "Đoạn chat";
    }, [name]);

    useEffect(() => {
        if (!roomId) return;

        const fetchMessages = async () => {
            try {
                setLoading(true);
                const res = await chatService.getMessages(String(roomId));
                const apiMessages: MessageDto[] = res.data?.messages ?? [];

                const mapped: ChatMessage[] = [...apiMessages]
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

                setMessages(mapped);
            } catch {
                // có thể hiển thị toast / alert sau
            } finally {
                setLoading(false);
            }
        };

        void fetchMessages();
    }, [roomId, meId]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !roomId || sending) return;

        try {
            setSending(true);
            const res = await chatService.sendMessage(String(roomId), text);
            const m = res.data?.message;
            if (!m) return;

            const newMsg: ChatMessage = {
                id: m._id,
                content: m.content,
                isMine: true,
                createdAt: m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                    : "",
            };

            setMessages((prev) => [...prev, newMsg]);
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
                    ) : (
                        <FlatList
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.messagesContent}
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
