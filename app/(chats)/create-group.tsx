import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { chatService } from "@/services/chat.service";

export default function CreateGroupScreen() {
    const router = useRouter();
    const [groupName, setGroupName] = useState("");
    const [keyword, setKeyword] = useState("");
    const [users, setUsers] = useState<[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // useEffect(() => {
    //     const fetchUsers = async () => {
    //         try {
    //             const res = await userService.getUsers();
    //             setUsers(res.data ?? []);
    //         } catch {
    //             setUsers([]);
    //         }
    //     };

    //     void fetchUsers();
    // }, []);

    const filteredUsers = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) => (u.displayName || u.username).toLowerCase().includes(q));
    }, [keyword, users]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || !selectedIds.length) return;

        try {
            const res = await chatService.createGroup(groupName.trim(), selectedIds);
            const group = res.data?.group;
            if (!group) {
                throw new Error("Không nhận được nhóm chat");
            }

            router.replace({
                pathname: "/(chats)/[roomId]",
                params: { roomId: group._id, name: group.title as string },
            });
        } catch (error: any) {
            Alert.alert("Lỗi", error?.message || "Không tạo được nhóm chat");
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </Pressable>
                <Text style={styles.headerTitle}>Tạo nhóm chat</Text>
            </View>

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

            <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm bạn bè..."
                    placeholderTextColor="#9ca3af"
                    value={keyword}
                    onChangeText={setKeyword}
                />
            </View>

            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                    const isSelected = selectedIds.includes(item._id);
                    return (
                        <Pressable
                            style={styles.userRow}
                            onPress={() => toggleSelect(item._id)}
                        >
                            <View style={styles.checkboxWrap}>
                                <Ionicons
                                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                    size={22}
                                    color={isSelected ? "#0a84ff" : "#9ca3af"}
                                />
                            </View>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarInitial}>
                                    {(item.displayName || item.username).charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName} numberOfLines={1}>
                                    {item.displayName || item.username}
                                </Text>
                                <Text style={styles.userSub} numberOfLines={1}>
                                    @{item.username}
                                </Text>
                            </View>
                        </Pressable>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>Không tìm thấy bạn bè phù hợp.</Text>
                    </View>
                }
            />

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Đã chọn {selectedIds.length} người
                </Text>
                <Pressable
                    style={[styles.createButton, !selectedIds.length && styles.createButtonDisabled]}
                    onPress={handleCreateGroup}
                    disabled={!selectedIds.length}
                >
                    <Text style={styles.createButtonText}>Tạo nhóm</Text>
                </Pressable>
            </View>
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
        fontSize: 17,
        fontWeight: "600",
        color: "#111",
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        marginHorizontal: 16,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#f3f4f6",
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        height: 38,
        fontSize: 14,
    },
    groupMetaWrap: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 12,
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
    listContent: {
        paddingTop: 4,
        paddingBottom: 80,
    },
    userRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    checkboxWrap: {
        marginRight: 8,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    avatarInitial: {
        fontSize: 16,
        fontWeight: "600",
        color: "#4b5563",
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#111",
    },
    userSub: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 2,
    },
    emptyWrap: {
        paddingVertical: 24,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 13,
        color: "#6b7280",
    },
    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#e5e5e5",
        backgroundColor: "#fff",
    },
    footerText: {
        fontSize: 13,
        color: "#4b5563",
    },
    createButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#0a84ff",
    },
    createButtonDisabled: {
        backgroundColor: "#9ca3af",
    },
    createButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
    },
});
