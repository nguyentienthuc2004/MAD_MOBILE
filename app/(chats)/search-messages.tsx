import type { RoomUser } from "@/services/chat.service";
import { chatService } from "@/services/chat.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function SearchMessagesScreen() {
    const router = useRouter();
    const { roomId } = useLocalSearchParams<{ roomId: string }>();
    const [keyword, setKeyword] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<RoomUser[]>([]);

    useEffect(() => {
        if (!roomId) return;
        chatService.getRooms().then(res => {
            const found = res.data?.rooms?.find(r => r._id === roomId);
            setUsers(found?.users || []);
        });
    }, [roomId]);

    const handleSearch = async () => {
        if (!keyword.trim() || !roomId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await chatService.getMessages(String(roomId), { keyword: keyword.trim() });
            setResults(res.data?.messages || []);
        } catch (err: any) {
            setError(err?.message || "Lỗi khi tìm kiếm");
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>{"<"}</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Tìm tin nhắn</Text>
            </View>
            <View style={styles.inputWrap}>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập nội dung cần tìm..."
                    placeholderTextColor="#9ca3af"
                    value={keyword}
                    onChangeText={setKeyword}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                <Pressable style={styles.searchButton} onPress={handleSearch} disabled={loading}>
                    <Text style={styles.searchButtonText}>{loading ? "Đang tìm..." : "Tìm"}</Text>
                </Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <FlatList
                data={results}
                keyExtractor={(item) => item._id}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                    !loading && keyword.trim()
                        ? <Text style={styles.empty}>Không tìm thấy tin nhắn phù hợp.</Text>
                        : null
                }
                renderItem={({ item }) => {
                    const sender = users.find(u => String(u.user_id) === String(item.sender_id));
                    return (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            backgroundColor: '#f3f4f6',
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 14,
                            shadowColor: '#000',
                            shadowOpacity: 0.04,
                            shadowRadius: 2,
                            elevation: 1,
                        }}>
                            <Image
                                source={{ uri: sender?.avatar || 'https://placehold.co/100x100?text=User' }}
                                style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#eee' }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 2 }}>
                                    {highlightText(sender?.nickname || 'Không rõ', keyword, { color: '#0a84ff', backgroundColor: '#e0e7ff' })}
                                </Text>
                                <Text style={{ fontSize: 15, color: '#222', marginBottom: 4 }}>
                                    {highlightText(item.content, keyword, { backgroundColor: '#fef08a', color: '#b45309' })}
                                </Text>
                                <Text style={{ fontSize: 12, color: '#888' }}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</Text>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#e5e5e5",
    },
    backButton: {
        paddingRight: 12,
        paddingVertical: 4,
    },
    backText: {
        fontSize: 20,
        color: "#0a84ff",
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#111",
        flex: 1,
    },
    inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 8,
    },
    input: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: "#e5e5e5",
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 15,
        backgroundColor: "#fafafa",
    },
    searchButton: {
        backgroundColor: "#0a84ff",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    searchButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 15,
    },
    error: {
        color: "#ef4444",
        marginHorizontal: 16,
        marginBottom: 8,
    },
    empty: {
        color: "#888",
        textAlign: "center",
        marginTop: 32,
        fontSize: 15,
    },
    resultItem: {
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#eee",
    },
    resultContent: {
        fontSize: 15,
        color: "#111",
    },
    resultTime: {
        fontSize: 12,
        color: "#888",
        marginTop: 2,
    },
});

function highlightText(text: string, keyword: string, highlightStyle: any) {
    if (!keyword) return <Text>{text}</Text>;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? (
            <Text key={i} style={highlightStyle}>{part}</Text>
        ) : (
            <Text key={i}>{part}</Text>
        ),
    );
}
