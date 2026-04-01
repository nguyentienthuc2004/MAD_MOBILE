import { useAuth } from "@/hooks/useAuth";
import { chatService } from "@/services/chat.service";
import { userService, type AppUser } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateGroupScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [groupName, setGroupName] = useState("");
    const [keyword, setKeyword] = useState("");
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        void bootstrap();
    }, []);

    const bootstrap = async () => {
        setLoading(true);
        try {
            const res = await userService.getUsers();
            const users = (res as any)?.data ?? [];
            setAllUsers(Array.isArray(users) ? users : []);
        } catch {
            setAllUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const selectableUsers = useMemo(() => {
        const meId = user?._id ? String(user._id) : "";
        const kw = keyword.trim().toLowerCase();

        return allUsers
            .filter((u) => {
                const id = String(u._id);
                if (!id) return false;
                if (id === meId) return false;

                if (!kw) return true;
                const hay = `${u.username || ""} ${u.displayName || ""} ${u.fullName || ""}`
                    .toLowerCase()
                    .trim();
                return hay.includes(kw);
            })
            .slice(0, 200);
    }, [allUsers, keyword, user?._id]);

    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const selectedUsers = useMemo(() => {
        if (!selectedIds.length) return [];
        return allUsers.filter((u) => selectedIdSet.has(String(u._id)));
    }, [allUsers, selectedIdSet, selectedIds.length]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleCreateGroup = async () => {
        const title = groupName.trim();
        if (!title) {
            Alert.alert("Thông báo", "Bạn chưa nhập tên nhóm");
            return;
        }
        if (!selectedIds.length) {
            Alert.alert("Thông báo", "Bạn chưa chọn thành viên nào");
            return;
        }

        setSubmitting(true);
        try {
            const res = await chatService.createGroup(title, selectedIds);
            if (!(res as any)?.success) {
                Alert.alert("Lỗi", (res as any)?.message || "Không tạo được nhóm chat");
                return;
            }

            const group = (res as any)?.data?.group;
            if (!group?._id) {
                throw new Error("Không nhận được nhóm chat");
            }

            router.replace({
                pathname: "/(chats)/[roomId]",
                params: { roomId: String(group._id), name: String(group.title || title) },
            });
        } catch (error: any) {
            Alert.alert("Lỗi", error?.message || "Không tạo được nhóm chat");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Tạo nhóm chat
                </Text>
                <Pressable
                    style={[
                        styles.headerAction,
                        submitting || loading || !groupName.trim() || !selectedIds.length
                            ? styles.headerActionDisabled
                            : null,
                    ]}
                    onPress={handleCreateGroup}
                    disabled={submitting || loading || !groupName.trim() || !selectedIds.length}
                >
                    <Text style={styles.headerActionText}>{submitting ? "Đang tạo..." : "Tạo"}</Text>
                </Pressable>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#0a84ff" />
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin nhóm</Text>
                        <View style={styles.groupMetaWrap}>
                            <Pressable
                                style={styles.groupAvatar}
                                onPress={() => {
                                    // TODO: mở picker để chọn ảnh nhóm
                                }}
                            >
                                <Ionicons name="camera-outline" size={22} color="#6b7280" />
                            </Pressable>
                            <View style={styles.groupNameWrap}>
                                <Text style={styles.groupNameLabel}>Tên nhóm</Text>
                                <TextInput
                                    style={styles.groupNameInput}
                                    placeholder="Nhập tên nhóm..."
                                    placeholderTextColor="#9ca3af"
                                    value={groupName}
                                    onChangeText={setGroupName}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Chọn thành viên</Text>
                        <View style={styles.searchWrap}>
                            <Ionicons name="search-outline" size={18} color="#6b7280" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm theo username/tên..."
                                placeholderTextColor="#9ca3af"
                                value={keyword}
                                onChangeText={setKeyword}
                            />
                            {keyword.trim() ? (
                                <Pressable onPress={() => setKeyword("")} style={{ padding: 6 }}>
                                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                                </Pressable>
                            ) : null}
                        </View>

                        <Text style={styles.selectedTitle}>Đã chọn ({selectedIds.length})</Text>
                        {selectedUsers.length ? (
                            <FlatList
                                data={selectedUsers}
                                keyExtractor={(u) => String(u._id)}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10 }}
                                renderItem={({ item }) => {
                                    const title = item.displayName || item.fullName || item.username;
                                    const avatar = item.avatarUrl;
                                    return (
                                        <View style={styles.selectedUserItem}>
                                            <View style={styles.selectedAvatarWrap}>
                                                {avatar ? (
                                                    <Image
                                                        source={{ uri: avatar }}
                                                        style={styles.selectedAvatar}
                                                    />
                                                ) : (
                                                    <View style={styles.selectedAvatarFallback}>
                                                        <Text style={styles.selectedAvatarInitial}>
                                                            {(String(title || "?") || "?")
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.selectedUserName} numberOfLines={1}>
                                                {title}
                                            </Text>
                                        </View>
                                    );
                                }}
                            />
                        ) : (
                            <Text style={styles.helperText}>Chưa chọn thành viên nào.</Text>
                        )}

                        <FlatList
                            data={selectableUsers}
                            keyExtractor={(u) => String(u._id)}
                            renderItem={({ item }) => {
                                const id = String(item._id);
                                const selected = selectedIdSet.has(id);
                                const title = item.displayName || item.fullName || item.username;

                                return (
                                    <Pressable
                                        style={[styles.userRow, selected ? styles.userRowSelected : null]}
                                        onPress={() => toggleSelect(id)}
                                    >
                                        <Ionicons
                                            name={selected ? "checkbox-outline" : "square-outline"}
                                            size={22}
                                            color={selected ? "#0a84ff" : "#9ca3af"}
                                            style={{ marginRight: 10 }}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.userTitle} numberOfLines={1}>
                                                {title}
                                            </Text>
                                            <Text style={styles.userSub} numberOfLines={1}>
                                                @{item.username}
                                            </Text>
                                        </View>
                                    </Pressable>
                                );
                            }}
                            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
                            ListEmptyComponent={
                                <Text style={styles.emptyTextInline}>Không có người dùng phù hợp.</Text>
                            }
                        />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        height: 52,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#e5e5e5",
    },
    backButton: { paddingRight: 8, paddingVertical: 4, marginRight: 4 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: "#111" },
    headerAction: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "#0a84ff",
    },
    headerActionDisabled: { opacity: 0.6 },
    headerActionText: { color: "#fff", fontWeight: "600" },

    section: { paddingTop: 12 },
    sectionTitle: {
        paddingHorizontal: 12,
        marginBottom: 10,
        fontSize: 14,
        fontWeight: "600",
        color: "#111",
    },

    groupMetaWrap: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
    },
    groupAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    groupNameWrap: {
        flex: 1,
    },
    groupNameLabel: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 4,
    },
    groupNameInput: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#d1d5db",
        paddingVertical: 4,
        fontSize: 14,
        color: "#111",
    },

    helperText: { color: "#6b7280", paddingHorizontal: 12, paddingTop: 2 },
    emptyTextInline: { color: "#6b7280", paddingHorizontal: 12, paddingTop: 8 },

    selectedUserItem: {
        width: 76,
        marginRight: 12,
        alignItems: "center",
        paddingBottom: 4,
    },
    selectedAvatarWrap: {
        width: 56,
        height: 56,
        marginBottom: 6,
    },
    selectedAvatar: {
        width: "100%",
        height: "100%",
        borderRadius: 28,
    },
    selectedAvatarFallback: {
        width: "100%",
        height: "100%",
        borderRadius: 28,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
    },
    selectedAvatarInitial: {
        fontSize: 18,
        fontWeight: "700",
        color: "#4b5563",
    },
    selectedUserName: {
        fontSize: 12,
        lineHeight: 16,
        color: "#111",
        textAlign: "center",
        paddingHorizontal: 2,
    },

    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 12,
        backgroundColor: "#f3f4f6",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 10,
    },
    searchInput: { flex: 1, marginLeft: 8, color: "#111" },

    selectedTitle: {
        paddingHorizontal: 12,
        marginBottom: 8,
        fontSize: 13,
        fontWeight: "600",
        color: "#111",
    },

    userRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 10,
    },
    userRowSelected: { backgroundColor: "#eef2ff" },
    userTitle: { fontSize: 15, fontWeight: "600", color: "#111" },
    userSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
});
