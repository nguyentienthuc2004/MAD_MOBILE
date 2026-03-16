import { useChatRooms } from "@/hooks/useChatRooms";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OnlineUsersList from "../../components/OnlineUsersList";
import { UserAvatar } from "../../components/UserAvatarItem";

const onlineUsers: UserAvatar[] = [
    {
        id: "1",
        name: "Linh",
        avatar:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
        isOnline: true,
    },
    {
        id: "2",
        name: "Minh",
        avatar:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
        isOnline: true,
    },
    {
        id: "3",
        name: "An",
        avatar:
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
        isOnline: true,
    },
    {
        id: "4",
        name: "Trang",
        avatar:
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
        isOnline: true,
    },
];

export default function ChatTabScreen() {
    const [search, setSearch] = useState("");
    const router = useRouter();
    const { rooms, loading, error, refetch } = useChatRooms();

    const filteredOnlineUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return onlineUsers;
        return onlineUsers.filter((u) =>
            u.name.toLowerCase().includes(keyword)
        );
    }, [search]);

    useFocusEffect(
        useCallback(() => {
            void refetch();
        }, [refetch]),
    );

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
                    onUserPress={(user) => {
                        console.log("Open chat with:", user.name);
                    }}
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
                            <Text style={styles.roomName} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={styles.lastMessage} numberOfLines={1}>
                                {item.lastMessage}
                            </Text>
                        </View>
                        <Text style={styles.time}>{item.updatedAt}</Text>
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
    lastMessage: {
        fontSize: 13,
        color: "#666",
    },
    time: {
        fontSize: 12,
        color: "#999",
        marginLeft: 8,
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
