import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { apiAuthRequest } from "../../services/api";

interface Member {
    user_id: string;
    nickname: string;
    avatar?: string;
    role: "owner" | "co_owner" | "member";
}

export default function GroupMembersScreen() {
    const router = useRouter();
    const { roomId } = useLocalSearchParams<{ roomId: string }>();
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [changing, setChanging] = useState<string | null>(null);
    const [menuMemberId, setMenuMemberId] = useState<string | null>(null);

    useEffect(() => {
        fetchMembers();
    }, [roomId]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await apiAuthRequest(`/chat/groups/${roomId}/member`, { method: "GET" }) as { data?: { users?: Member[] } };
            setMembers(res.data?.users || []);
        } catch (e) {
            Alert.alert("Lỗi", "Không lấy được danh sách thành viên");
        } finally {
            setLoading(false);
        }
    };

    const handleKickMember = async (targetId: string) => {
        if (!user) return;
        if (user._id === targetId) {
            Alert.alert("Không thể tự kick chính mình");
            return;
        }
        setMenuMemberId(null); // Đóng menu ngay khi chọn
        setTimeout(() => {
            Alert.alert(
                "Xác nhận",
                "Bạn có chắc muốn xoá thành viên này khỏi nhóm?",
                [
                    { text: "Huỷ", style: "cancel" },
                    {
                        text: "Xoá",
                        style: "destructive",
                        onPress: async () => {
                            setChanging(targetId);
                            try {
                                await apiAuthRequest(`/chat/groups/${roomId}/member/${targetId}`, {
                                    method: "DELETE",
                                });
                                fetchMembers();
                            } catch (e) {
                                Alert.alert("Lỗi", "Không xoá được thành viên");
                            } finally {
                                setChanging(null);
                            }
                        },
                    },
                ]
            );
        }, 100); // Đợi menu đóng hẳn
    };

    const handleViewProfile = (targetId: string) => {
        setMenuMemberId(null);
        router.push({ pathname: "/users/[userId]", params: { userId: targetId } });
    };

    const handleChangeRole = async (targetId: string, currentRole: string) => {
        if (!user) return;
        setMenuMemberId(null); // Đóng menu ngay khi chọn
        setTimeout(() => {
            // Lấy role hiện tại của user trong nhóm
            const myMember = members.find(m => m.user_id === user._id);
            const myRole = myMember?.role;
            if (user._id === targetId && currentRole === "owner") {
                Alert.alert("Không thể tự hạ quyền owner");
                return;
            }
            const options = [
                { label: "Chủ nhóm", value: "owner" },
                { label: "Phó nhóm", value: "co_owner" },
                { label: "Thành viên", value: "member" },
            ];
            Alert.alert(
                "Đổi quyền thành viên",
                "Chọn quyền mới cho thành viên này:",
                [
                    ...options.map((opt) => ({
                        text: opt.label,
                        onPress: async () => {
                            setChanging(targetId);
                            try {
                                await apiAuthRequest(`/chat/groups/${roomId}/member/${targetId}/role`, {
                                    method: "PATCH",
                                    body: { newRole: opt.value },
                                });
                                fetchMembers();
                            } catch (e) {
                                Alert.alert("Lỗi", "Không đổi được quyền");
                            } finally {
                                setChanging(null);
                            }
                        },
                    })),
                    { text: "Hủy", style: "cancel" as const },
                ]
            );
        }, 100); // Đợi menu đóng hẳn
    };

    const renderItem = ({ item }: { item: Member }) => {
        const myMember = members.find(m => m.user_id === user?._id);
        const isOwner = myMember?.role === "owner";
        return (
            <View style={styles.memberRow}>
                <Ionicons name="person-circle-outline" size={40} color="#9ca3af" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.nickname}>{item.nickname}</Text>
                    <Text style={styles.role}>
                        {item.role === "owner"
                            ? "Chủ nhóm"
                            : item.role === "co_owner"
                                ? "Phó nhóm"
                                : "Thành viên"}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.menuBtn}
                    onPress={() => setMenuMemberId(item.user_id)}
                >
                    <Ionicons name="ellipsis-vertical" size={22} color="#6b7280" />
                </TouchableOpacity>
                {/* Menu modal */}
                <Modal
                    visible={menuMemberId === item.user_id}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setMenuMemberId(null)}
                >
                    <TouchableOpacity
                        style={styles.menuBackdrop}
                        activeOpacity={1}
                        onPress={() => setMenuMemberId(null)}
                    >
                        <View style={styles.menuModal}>
                            {isOwner && (
                                <Pressable
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setMenuMemberId(null);
                                        handleChangeRole(item.user_id, item.role);
                                    }}
                                    disabled={changing === item.user_id}
                                >
                                    <Ionicons name="swap-horizontal-outline" size={18} color="#0a84ff" style={{ marginRight: 8 }} />
                                    <Text style={styles.menuText}>Đổi quyền trong nhóm</Text>
                                </Pressable>
                            )}
                            {isOwner && item.role !== "owner" && (
                                <Pressable
                                    style={styles.menuItem}
                                    onPress={() => handleKickMember(item.user_id)}
                                    disabled={changing === item.user_id}
                                >
                                    <Ionicons name="person-remove-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                                    <Text style={[styles.menuText, { color: "#ef4444" }]}>Xoá khỏi nhóm</Text>
                                </Pressable>
                            )}
                            <Pressable
                                style={styles.menuItem}
                                onPress={() => handleViewProfile(item.user_id)}
                            >
                                <Ionicons name="person-circle-outline" size={18} color="#6366f1" style={{ marginRight: 8 }} />
                                <Text style={styles.menuText}>Xem trang cá nhân</Text>
                            </Pressable>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        );
    };

    const myMember = members.find(m => m.user_id === user?._id);
    const canAddMember = myMember?.role === "owner" || myMember?.role === "co_owner";

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </Pressable>
                <Text style={styles.headerTitle}>Thành viên nhóm</Text>

                {canAddMember ? (
                    <Pressable
                        style={styles.headerAction}
                        onPress={() => {
                            if (!roomId) return;
                            router.push({
                                pathname: "/(chats)/add-members",
                                params: { roomId: String(roomId) },
                            });
                        }}
                    >
                        <Ionicons name="person-add-outline" size={22} color="#111" />
                    </Pressable>
                ) : null}
            </View>
            {loading ? (
                <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#0a84ff" />
            ) : (
                <FlatList
                    data={members}
                    keyExtractor={(item) => item.user_id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                />
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
    headerAction: { paddingLeft: 8, paddingVertical: 6 },
    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    nickname: { fontSize: 16, fontWeight: "500", color: "#111" },
    role: { fontSize: 13, color: "#6b7280", marginTop: 2 },
    changeBtn: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: "#e0e7ff",
        marginLeft: 8,
    },
    menuBtn: {
        padding: 8,
        borderRadius: 6,
        marginLeft: 8,
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    menuModal: {
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 0,
        minWidth: 220,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 18,
    },
    menuText: {
        fontSize: 15,
        color: "#222",
    },
});
