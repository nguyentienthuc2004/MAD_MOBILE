import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

import { chatService, type RoomUser } from "@/services/chat.service";
import { userService } from "@/services/user.service";

export default function NicknamesScreen() {
    const router = useRouter();
    const { roomId, name } =
        useLocalSearchParams<{ roomId: string; name?: string }>();

    const [members, setMembers] = useState<RoomUser[]>([]);
    const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
    const [nicknameEdits, setNicknameEdits] = useState<Record<string, string>>({});
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingNickname, setEditingNickname] = useState<string>("");

    const roomIdStr = typeof roomId === "string" ? roomId : String(roomId ?? "");

    const fetchMembers = useCallback(async () => {
        if (!roomIdStr) return;
        try {
            setLoadingMembers(true);
            const res = await chatService.getRooms();
            const apiRooms = res.data?.rooms ?? [];
            const room = apiRooms.find((r) => r._id === roomIdStr);
            const users = room?.users ?? [];
            setMembers(users);

            // Khởi tạo danh sách biệt danh đang chỉnh sửa
            const nicknameEntries: Record<string, string> = {};
            users.forEach((u) => {
                nicknameEntries[u.user_id] = u.nickname || "";
            });
            setNicknameEdits(nicknameEntries);

            // Lấy username thật cho từng user trong room
            const uniqueIds = Array.from(new Set(users.map((u) => u.user_id)));
            const usernameEntries: Record<string, string> = {};

            await Promise.all(
                uniqueIds.map(async (id) => {
                    try {
                        const res = await userService.getUserById(id);
                        const user = res.data;
                        if (user) {
                            usernameEntries[id] = user.displayName || user.username || "";
                        }
                    } catch {
                        // bỏ qua lỗi từng user
                    }
                }),
            );

            setUsernameMap(usernameEntries);
        } catch {
            Alert.alert("Lỗi", "Không thể tải danh sách thành viên");
        } finally {
            setLoadingMembers(false);
        }
    }, [roomIdStr]);

    const handleSaveNickname = useCallback(
        async (userId: string) => {
            if (!roomIdStr) return;
            const nickname = editingNickname.trim();

            try {
                setSavingUserId(userId);
                const res = await chatService.updateNickname(roomIdStr, userId, nickname);

                const updatedRoom = res.data?.room;
                if (updatedRoom?.users) {
                    setMembers(updatedRoom.users);

                    const nextEdits: Record<string, string> = {};
                    updatedRoom.users.forEach((u) => {
                        nextEdits[u.user_id] = u.nickname || "";
                    });
                    setNicknameEdits(nextEdits);
                }

                Alert.alert("Thành công", "Đã cập nhật biệt danh");
            } catch {
                Alert.alert("Lỗi", "Không thể cập nhật biệt danh");
            } finally {
                setSavingUserId(null);
            }
        },
        [editingNickname, roomIdStr],
    );

    useEffect(() => {
        void fetchMembers();
    }, [fetchMembers]);

    const selectedMember =
        editingUserId != null
            ? members.find((m) => m.user_id === editingUserId)
            : null;

    const handleSelectMember = (user: RoomUser) => {
        setEditingUserId(user.user_id);
        const currentNickname = nicknameEdits[user.user_id] ?? user.nickname ?? "";
        setEditingNickname(currentNickname);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Biệt danh
                </Text>
            </View>

            {editingUserId && selectedMember ? (
                <View style={styles.editContainer}>
                    <View style={styles.editMemberRow}>
                        {selectedMember.avatar ? (
                            <Image
                                source={{ uri: selectedMember.avatar }}
                                style={styles.memberAvatar}
                            />
                        ) : (
                            <View style={styles.memberAvatarFallback}>
                                <Text style={styles.memberAvatarInitial}>
                                    {selectedMember.nickname
                                        ? selectedMember.nickname.charAt(0).toUpperCase()
                                        : "?"}
                                </Text>
                            </View>
                        )}
                        <View style={styles.memberInfo}>
                            <Text style={styles.memberName} numberOfLines={1}>
                                {usernameMap[selectedMember.user_id] ||
                                    "(Không tìm thấy username)"}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.editLabel}>Biệt danh mới</Text>
                    <TextInput
                        style={styles.textInput}
                        value={editingNickname}
                        placeholder="Nhập biệt danh mới"
                        onChangeText={(text) => {
                            setEditingNickname(text);
                        }}
                    />

                    <View style={styles.editActions}>
                        <Pressable
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={() => {
                                setEditingUserId(null);
                                setEditingNickname("");
                            }}
                        >
                            <Text
                                style={[styles.actionButtonText, styles.cancelButtonText]}
                            >
                                Hủy
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.actionButton, styles.saveEditButton]}
                            onPress={async () => {
                                if (!editingUserId) return;
                                await handleSaveNickname(editingUserId);
                                setEditingUserId(null);
                                setEditingNickname("");
                            }}
                            disabled={savingUserId === editingUserId}
                        >
                            {savingUserId === editingUserId ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text
                                    style={[styles.actionButtonText, styles.saveButtonText]}
                                >
                                    Lưu
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            ) : loadingMembers ? (
                <View style={styles.membersLoadingRow}>
                    <ActivityIndicator />
                    <Text style={styles.membersLoadingText}>Đang tải danh sách...</Text>
                </View>
            ) : (
                <FlatList
                    data={members}
                    keyExtractor={(item) => item.user_id}
                    contentContainerStyle={styles.membersListContent}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.memberRow}
                            onPress={() => handleSelectMember(item)}
                        >
                            <View style={styles.memberLeft}>
                                {item.avatar ? (
                                    <Image
                                        source={{ uri: item.avatar }}
                                        style={styles.memberAvatar}
                                    />
                                ) : (
                                    <View style={styles.memberAvatarFallback}>
                                        <Text style={styles.memberAvatarInitial}>
                                            {item.nickname
                                                ? item.nickname.charAt(0).toUpperCase()
                                                : "?"}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.memberInfo}>
                                    <Text
                                        style={styles.memberName}
                                        numberOfLines={1}
                                    >
                                        {nicknameEdits[item.user_id] || "Chưa đặt biệt danh"}
                                    </Text>
                                    <Text
                                        style={styles.memberNickname}
                                        numberOfLines={1}
                                    >
                                        {usernameMap[item.user_id] ||
                                            "(Không tìm thấy username)"}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
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
        flex: 1,
        fontSize: 17,
        fontWeight: "600",
        color: "#111",
        textAlign: "center",
    },
    membersLoadingRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    membersLoadingText: {
        fontSize: 13,
        color: "#6b7280",
    },
    membersListContent: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    memberRow: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    memberLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    memberAvatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    memberAvatarInitial: {
        fontSize: 16,
        fontWeight: "700",
        color: "#4b5563",
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 2,
    },
    memberNickname: {
        fontSize: 13,
        color: "#6b7280",
    },
    fieldLabel: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 4,
    },
    fieldLabelSpacing: {
        marginTop: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        color: "#111827",
        backgroundColor: "#f9fafb",
    },
    textInputDisabled: {
        backgroundColor: "#f3f4f6",
        color: "#9ca3af",
    },
    editContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    editMemberRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    editLabel: {
        fontSize: 13,
        fontWeight: "500",
        color: "#4b5563",
        marginBottom: 6,
        marginTop: 4,
    },
    editActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 16,
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: "600",
    },
    cancelButton: {
        backgroundColor: "#ffffff",
    },
    cancelButtonText: {
        color: "#4b5563",
    },
    saveEditButton: {
        backgroundColor: "#2563eb",
        borderColor: "#2563eb",
    },
    saveButtonText: {
        color: "#ffffff",
    },
});
