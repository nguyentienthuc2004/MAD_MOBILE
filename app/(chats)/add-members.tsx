import { useAuth } from "@/hooks/useAuth";
import { apiAuthRequest } from "@/services/api";
import { chatService } from "@/services/chat.service";
import { userService, type AppUser } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Member = {
    user_id: string;
    nickname: string;
    avatar?: string;
    role: "owner" | "co_owner" | "member";
};

export default function AddMembersScreen() {
    const router = useRouter();
    const { roomId } = useLocalSearchParams<{ roomId: string }>();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [keyword, setKeyword] = useState("");

    const [members, setMembers] = useState<Member[]>([]);
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    const bootstrap = async () => {
        if (!roomId) return;
        setLoading(true);
        try {
            const [memberRes, usersRes] = await Promise.all([
                apiAuthRequest(`/chat/groups/${roomId}/member`, { method: "GET" }) as Promise<{
                    data?: { users?: Member[] };
                }>,
                userService.getUsers(),
            ]);

            const currentMembers = memberRes.data?.users || [];
            setMembers(currentMembers);

            const users = (usersRes as any)?.data || [];
            setAllUsers(Array.isArray(users) ? users : []);
        } catch (e) {
            Alert.alert("Lỗi", "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    const memberIdSet = useMemo(() => {
        return new Set(members.map((m) => String(m.user_id)));
    }, [members]);

    const selectableUsers = useMemo(() => {
        const meId = user?._id ? String(user._id) : "";
        const kw = keyword.trim().toLowerCase();

        return allUsers
            .filter((u) => {
                const id = String(u._id);
                if (!id) return false;
                if (id === meId) return false;
                if (memberIdSet.has(id)) return false;

                if (!kw) return true;
                const hay = `${u.username || ""} ${u.displayName || ""} ${u.fullName || ""}`
                    .toLowerCase()
                    .trim();
                return hay.includes(kw);
            })
            .slice(0, 200);
    }, [allUsers, keyword, memberIdSet, user?._id]);

    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleSubmit = async () => {
        if (!roomId) return;
        if (!selectedIds.length) {
            Alert.alert("Thông báo", "Bạn chưa chọn thành viên nào");
            return;
        }

        setSubmitting(true);
        try {
            const pickedUsers = allUsers.filter((u) => selectedIdSet.has(String(u._id)));
            const displayNames = pickedUsers
                .map((u) => u.displayName || u.fullName || u.username)
                .filter(Boolean);

            const res = await chatService.addMembersToGroup(String(roomId), selectedIds);
            if (!(res as any)?.success) {
                Alert.alert("Lỗi", (res as any)?.message || "Không thêm được thành viên");
                return;
            }

            const systemNotice =
                displayNames.length > 0
                    ? `Đã thêm ${displayNames.join(", ")} vào nhóm.`
                    : `Đã thêm thành viên mới vào nhóm.`;

            router.replace({
                pathname: "/(chats)/[roomId]",
                params: { roomId: String(roomId), systemNotice },
            });
        } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không thêm được thành viên");
        } finally {
            setSubmitting(false);
        }
    };

    const renderMember = ({ item }: { item: Member }) => {
        return (
            <View style={styles.memberRow}>
                <Ionicons name="person-circle-outline" size={34} color="#9ca3af" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.memberName}>{item.nickname}</Text>
                    <Text style={styles.memberRole}>
                        {item.role === "owner" ? "Chủ nhóm" : item.role === "co_owner" ? "Phó nhóm" : "Thành viên"}
                    </Text>
                </View>
            </View>
        );
    };

    const renderUser = ({ item }: { item: AppUser }) => {
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
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Thêm thành viên
                </Text>
                <Pressable
                    style={[styles.headerAction, submitting || loading ? styles.headerActionDisabled : null]}
                    onPress={handleSubmit}
                    disabled={submitting || loading}
                >
                    <Text style={styles.headerActionText}>{submitting ? "Đang thêm..." : "Xong"}</Text>
                </Pressable>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#0a84ff" />
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thành viên hiện tại ({members.length})</Text>
                        <FlatList
                            data={members}
                            keyExtractor={(m) => m.user_id}
                            renderItem={renderMember}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 12 }}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Chọn thành viên để thêm</Text>
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
                                <Pressable onPress={() => setKeyword("")}
                                    style={{ padding: 6 }}
                                >
                                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                                </Pressable>
                            ) : null}
                        </View>

                        <FlatList
                            data={selectableUsers}
                            keyExtractor={(u) => String(u._id)}
                            renderItem={renderUser}
                            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
                            ListEmptyComponent={
                                <Text style={{ color: "#6b7280", paddingHorizontal: 12, paddingTop: 8 }}>
                                    Không có người dùng phù hợp.
                                </Text>
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
    headerAction: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#0a84ff" },
    headerActionDisabled: { opacity: 0.6 },
    headerActionText: { color: "#fff", fontWeight: "600" },

    section: { paddingTop: 12 },
    sectionTitle: { paddingHorizontal: 12, marginBottom: 10, fontSize: 14, fontWeight: "600", color: "#111" },

    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginRight: 10,
    },
    memberName: { fontSize: 14, fontWeight: "600", color: "#111" },
    memberRole: { fontSize: 12, color: "#6b7280", marginTop: 2 },

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
