import { useAuth } from "@/hooks/useAuth";
import { useChatRooms } from "@/hooks/useChatRooms";
import { followService } from "@/services/follow.service";
import { userService } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OnlineUsersList from "../../components/OnlineUsersList";
import { UserAvatar } from "../../components/UserAvatarItem";

export default function ChatTabScreen() {
    const [search, setSearch] = useState("");
    const router = useRouter();
    const { rooms, loading, error, refetch } = useChatRooms();
    const [refreshing, setRefreshing] = useState(false);
    const user = useAuth((state) => state.user);
    const [users, setUsers] = useState<any[]>([]);
    const [followIds, setFollowIds] = useState<Set<string>>(new Set());

    // Lấy danh sách user và follow từ API
    const fetchUsersAndFollows = useCallback(async () => {
        if (!user?._id) {
            setUsers([]);
            setFollowIds(new Set());
            return;
        }
        try {
            const [usersRes, followersRes, followingRes] = await Promise.all([
                userService.getUsers(),
                followService.getFollowers(user._id),
                followService.getFollowing(user._id),
            ]);
            setUsers(usersRes.data ?? []);
            const followerIds = (followersRes.data ?? []).map((u: any) => u._id);
            const followingIds = (followingRes.data ?? []).map((u: any) => u._id);
            setFollowIds(new Set([...followerIds, ...followingIds]));
        } catch {
            setUsers([]);
            setFollowIds(new Set());
        }
    }, [user?._id]);

    useEffect(() => {
        fetchUsersAndFollows();
    }, [fetchUsersAndFollows]);

    const onlineUsers = useMemo(() => {
        return users
            .filter((item) => item._id !== user?._id && followIds.has(item._id))
            .map((item) => ({
                id: item._id,
                name: item.displayName || item.username || "Người dùng",
                avatar: item.avatarUrl,
                isOnline: item.isOnline,
            }));
    }, [user?._id, users, followIds]);

    const filteredOnlineUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return onlineUsers;
        return onlineUsers.filter((u) =>
            u.name.toLowerCase().includes(keyword)
        );
    }, [search, onlineUsers]);

    const handleOpenUserByAvatar = async (selectedUser: UserAvatar) => {
        if (!selectedUser.id) {
            return;
        }
        if (selectedUser.id === user?._id) {
            void router.push("/(tabs)/profile");
            return;
        }
        try {
            const res = await import("@/services/chat.service").then(m => m.chatService.createRoom(selectedUser.id));
            const room = res.data?.room;
            if (!room) throw new Error("Không nhận được phòng chat");
            router.push({
                pathname: "/(chats)/[roomId]",
                params: { roomId: room._id, name: selectedUser.name },
            });
        } catch (error: any) {
            // eslint-disable-next-line no-alert
            alert(error?.message || "Không mở được phòng chat");
        }
    };

    useFocusEffect(
        useCallback(() => {
            void refetch();
        }, [refetch]),
    );

    const handleRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await refetch();
            await fetchUsersAndFollows();
        } finally {
            setRefreshing(false);
        }
    }, [refetch, fetchUsersAndFollows]);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tin nhắn</Text>
                <Pressable
                    style={styles.newMessageButton}
                    onPress={() => router.push("/(chats)/new-chat")}
                >
                    <Ionicons name="create-outline" size={22} color="#0a84ff" />
                </Pressable>
            </View>

            <View style={styles.searchWrap}>
                <TextInput
                    placeholder="Tìm bạn bè..."
                    placeholderTextColor="#9ca3af"
                    value={search}
                    onChangeText={setSearch}
                    style={styles.searchInput}
                />
            </View>

            <View style={styles.onlineSection}>
                <OnlineUsersList
                    users={filteredOnlineUsers}
                    onUserPress={handleOpenUserByAvatar}
                />
            </View>

            {error ? (
                <View style={styles.errorWrap}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            <FlatList
                data={rooms}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.roomItem}
                        onPress={() =>
                            router.push({
                                pathname: "/(chats)/[roomId]",
                                params: { roomId: item.id, name: item.name },
                            })
                        }
                    >
                        {item.avatar ? (
                            <Image
                                source={{ uri: item.avatar }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder} />
                        )}
                        <View style={styles.roomInfo}>
                            <Text
                                style={[
                                    styles.roomName,
                                    item.unreadCount > 0 && styles.roomNameUnread,
                                ]}
                                numberOfLines={1}
                            >
                                {item.name}
                            </Text>
                            <Text
                                style={[
                                    styles.lastMessage,
                                    item.unreadCount > 0 && styles.lastMessageUnread,
                                ]}
                                numberOfLines={1}
                            >
                                {item.lastMessage}
                            </Text>
                        </View>
                        <View style={styles.rightColumn}>
                            <Text style={styles.time}>{item.updatedAt}</Text>
                            {item.unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>
                                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Pressable>
                )}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>
                                Bạn chưa có đoạn chat nào.
                            </Text>
                        </View>
                    ) : null
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
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#e5e5e5",
        justifyContent: "space-between",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    newMessageButton: {
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderRadius: 16,
    },
    searchWrap: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    searchInput: {
        height: 38,
        borderRadius: 20,
        paddingHorizontal: 14,
        backgroundColor: "#f3f4f6",
        fontSize: 14,
    },
    onlineSection: {
        paddingTop: 12,
        paddingBottom: 14,
    },
    listContent: {
        paddingVertical: 8,
    },
    errorWrap: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    errorText: {
        fontSize: 13,
        color: "#dc2626",
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#f0f0f0",
        marginLeft: 72,
    },
    roomItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: "#e5e5e5",
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#e5e5e5",
        marginRight: 12,
    },
    roomInfo: {
        flex: 1,
    },
    roomName: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 2,
    },
    roomNameUnread: {
        fontWeight: "700",
    },
    lastMessage: {
        fontSize: 13,
        color: "#666",
    },
    lastMessageUnread: {
        color: "#111",
        fontWeight: "500",
    },
    time: {
        fontSize: 12,
        color: "#999",
        marginLeft: 8,
    },
    rightColumn: {
        alignItems: "flex-end",
        marginLeft: 8,
    },
    unreadBadge: {
        marginTop: 4,
        minWidth: 20,
        paddingHorizontal: 6,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#0a84ff",
        alignItems: "center",
        justifyContent: "center",
    },
    unreadText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#fff",
    },
    emptyWrap: {
        paddingVertical: 16,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 13,
        color: "#6b7280",
    },
});