import { userService, type AppUser } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatSearchScreen() {
    const router = useRouter();
    const [keyword, setKeyword] = useState("");
    const [users, setUsers] = useState<AppUser[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await userService.getUsers();
                setUsers(res.data ?? []);
            } catch {
                setUsers([]);
            }
        };

        void fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) =>
            (u.displayName || u.username).toLowerCase().includes(q),
        );
    }, [keyword, users]);

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </Pressable>
                <Text style={styles.headerTitle}>Tin nhắn mới</Text>
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

            <Pressable
                style={styles.groupRow}
                onPress={() => router.push("/(chats)/create-group")}
            >
                <View style={styles.groupIconWrap}>
                    <Ionicons name="people-outline" size={18} color="#0a84ff" />
                </View>
                <Text style={styles.groupText}>Tạo nhóm chat mới</Text>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </Pressable>

            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.userRow}
                        onPress={() => {
                            // TODO: tạo hoặc mở phòng chat 1-1 với user này
                        }}
                    >
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
                )}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>Không tìm thấy bạn bè phù hợp.</Text>
                    </View>
                }
            />
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
    groupRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#e5e5e5",
    },
    groupIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#e0f2fe",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    groupText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: "#111",
    },
    listContent: {
        paddingTop: 4,
    },
    userRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
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
});
