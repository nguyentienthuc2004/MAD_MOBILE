import { useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OnlineUsersList from "../../components/OnlineUsersList";
import { UserAvatar } from "../../components/UserAvatarItem";

type ChatRoom = {
    id: string;
    name: string;
    lastMessage: string;
    updatedAt: string;
};

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

const chatRooms: ChatRoom[] = [
    {
        id: "1",
        name: "Nhóm bạn thân",
        lastMessage: "Cuối tuần này đi chơi nhé!",
        updatedAt: "10:30",
    },
    {
        id: "2",
        name: "Lớp CNTT K16",
        lastMessage: "Mai nộp bài tập đồ án nhớ.",
        updatedAt: "09:15",
    },
    {
        id: "3",
        name: "Công ty ABC",
        lastMessage: "Ok, mình nhận được file rồi.",
        updatedAt: "Hôm qua",
    },
    {
        id: "4",
        name: "Gia đình",
        lastMessage: "Nhớ gọi về cho mẹ nhé.",
        updatedAt: "Hôm qua",
    },
    {
        id: "5",
        name: "Team đồ án",
        lastMessage: "Tối nay họp Zoom lúc 8h.",
        updatedAt: "Thứ 2",
    },
    {
        id: "6",
        name: "CLB Bóng đá",
        lastMessage: "Cuối tuần đá sân trường cũ.",
        updatedAt: "Thứ 3",
    },
    {
        id: "7",
        name: "Nhóm lớp cấp 3",
        lastMessage: "Tụ họp kỷ niệm 10 năm nè.",
        updatedAt: "Thứ 4",
    },
    {
        id: "8",
        name: "Công ty XYZ",
        lastMessage: "File báo cáo em gửi rồi ạ.",
        updatedAt: "Thứ 5",
    },
    {
        id: "9",
        name: "Hội anh em game",
        lastMessage: "Đêm nay rank không?",
        updatedAt: "Thứ 6",
    },
    {
        id: "10",
        name: "Nhóm đi Đà Lạt",
        lastMessage: "Chốt lịch đặt vé xe đi.",
        updatedAt: "Tuần trước",
    },
    {
        id: "11",
        name: "Lớp tiếng Anh",
        lastMessage: "Mai có quiz nhỏ, nhớ ôn.",
        updatedAt: "Tuần trước",
    },
    {
        id: "12",
        name: "Dự án freelance",
        lastMessage: "Khách duyệt bản thiết kế rồi.",
        updatedAt: "2 tuần trước",
    },
    {
        id: "13",
        name: "Nhóm học React Native",
        lastMessage: "Tối nay live code phần chat.",
        updatedAt: "2 tuần trước",
    },
    {
        id: "14",
        name: "Gym buddies",
        lastMessage: "Mai tập ngực – tay sau nha.",
        updatedAt: "3 tuần trước",
    },
    {
        id: "15",
        name: "Nhóm thử nghiệm app",
        lastMessage: "Gửi feedback giao diện mới đi.",
        updatedAt: "Tháng trước",
    },
];

export default function ChatTabScreen() {
    const [search, setSearch] = useState("");

    const filteredOnlineUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return onlineUsers;
        return onlineUsers.filter((u) =>
            u.name.toLowerCase().includes(keyword)
        );
    }, [search]);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tin nhắn</Text>
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

            <FlatList
                data={chatRooms}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => (
                    <Pressable style={styles.roomItem} onPress={() => { }}>
                        <View style={styles.avatarPlaceholder} />
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
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
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
});
