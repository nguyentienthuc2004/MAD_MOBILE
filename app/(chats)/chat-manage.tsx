import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatManageScreen() {
    const router = useRouter();
    const { roomId, name, userId } =
        useLocalSearchParams<{ roomId: string; name?: string; userId?: string }>();

    const [searchKeyword, setSearchKeyword] = useState("");
    const [notificationEnabled, setNotificationEnabled] = useState(true);
    const [showSearchModal, setShowSearchModal] = useState(false);

    const hasUserProfile = typeof userId === "string" && userId.length > 0;

    const handleSearchMessages = () => {
        if (!searchKeyword.trim()) {
            Alert.alert("Thông báo", "Nhập nội dung muốn tìm kiếm");
            return;
        }
        // TODO: Gọi API hoặc chuyển sang màn xem kết quả tìm kiếm trong cuộc hội thoại
        Alert.alert(
            "Tìm kiếm",
            `Sẽ tìm tin nhắn chứa: "${searchKeyword.trim()}" trong đoạn chat.`,
        );
        setShowSearchModal(false);
    };

    const handleToggleNotification = (value: boolean) => {
        setNotificationEnabled(value);
        // TODO: Gửi trạng thái bật/tắt thông báo cho backend hoặc lưu local
    };

    const handleDeleteChat = () => {
        Alert.alert(
            "Xóa đoạn chat",
            "Bạn có chắc muốn xóa toàn bộ lịch sử đoạn chat này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: () => {
                        // TODO: Gọi API xóa đoạn chat hoặc đánh dấu isDeleted
                        Alert.alert("Đã xóa", "Đoạn chat đã được xóa (giả lập).");
                        router.back();
                    },
                },
            ],
        );
    };

    const handleBlock = () => {
        Alert.alert(
            "Chặn",
            "Bạn có chắc muốn chặn người trong đoạn chat này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Chặn",
                    style: "destructive",
                    onPress: () => {
                        // TODO: Gọi API chặn user / chặn phòng chat
                        Alert.alert("Đã chặn", "Yêu cầu chặn đã được ghi nhận (giả lập).");
                        router.back();
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Quản lý đoạn chat
                </Text>
            </View>

            <View style={styles.roomInfo}>
                <View style={styles.roomAvatarWrap}>
                    <Ionicons
                        name="person-circle-outline"
                        size={64}
                        color="#9ca3af"
                    />
                </View>
                <Text style={styles.roomName} numberOfLines={1}>
                    {name || "Đoạn chat"}
                </Text>
                {hasUserProfile && (
                    <Pressable
                        style={styles.profileButton}
                        onPress={() => {
                            router.push({
                                pathname: "/users/[userId]",
                                params: { userId: String(userId) },
                            });
                        }}
                    >
                        <Text style={styles.profileButtonText}>Xem trang cá nhân</Text>
                    </Pressable>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cá nhân & hiển thị</Text>

                <Pressable
                    style={styles.row}
                    onPress={() => {
                        if (!roomId) return;
                        const params: Record<string, string> = {
                            roomId: String(roomId),
                        };
                        if (name) params.name = String(name);
                        router.push({ pathname: "/(chats)/nicknames", params });
                    }}
                >
                    <View style={styles.rowLeft}>
                        <Ionicons
                            name="people-outline"
                            size={20}
                            color="#0a84ff"
                            style={styles.rowIcon}
                        />
                        <Text style={styles.rowTitle}>Biệt danh</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>

                <Pressable
                    style={styles.row}
                    onPress={() => {
                        if (!roomId) return;
                        router.push(`/(chats)/search-messages?roomId=${roomId}`);
                    }}
                >
                    <View style={styles.rowLeft}>
                        <Ionicons
                            name="search-outline"
                            size={20}
                            color="#10b981"
                            style={styles.rowIcon}
                        />
                        <Text style={styles.rowTitle}>Tìm tin nhắn trong đoạn chat</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông báo</Text>

                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <Ionicons
                            name={notificationEnabled ? "notifications-outline" : "notifications-off-outline"}
                            size={20}
                            color="#f59e0b"
                            style={styles.rowIcon}
                        />
                        <Text style={styles.rowTitle}>Bật/Tắt thông báo</Text>
                    </View>
                    <Switch
                        value={notificationEnabled}
                        onValueChange={handleToggleNotification}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hành động khác</Text>

                <Pressable style={styles.row} onPress={handleDeleteChat}>
                    <View style={styles.rowLeft}>
                        <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#ef4444"
                            style={styles.rowIcon}
                        />
                        <Text style={[styles.rowTitle, styles.dangerText]}>Xóa đoạn chat</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>

                <Pressable style={styles.row} onPress={handleBlock}>
                    <View style={styles.rowLeft}>
                        <Ionicons
                            name="hand-right-outline"
                            size={20}
                            color="#dc2626"
                            style={styles.rowIcon}
                        />
                        <Text style={[styles.rowTitle, styles.dangerText]}>Chặn</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>
            </View>

            {/* Modal tìm tin nhắn */}
            <Modal
                visible={showSearchModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSearchModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Tìm tin nhắn</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Nhập nội dung cần tìm..."
                            placeholderTextColor="#9ca3af"
                            value={searchKeyword}
                            onChangeText={setSearchKeyword}
                        />
                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalButton, styles.modalCancel]}
                                onPress={() => setShowSearchModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.modalPrimary]}
                                onPress={handleSearchMessages}
                            >
                                <Text style={styles.modalPrimaryText}>Tìm</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
    },
    roomInfo: {
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#e5e5e5",
    },
    roomAvatarWrap: {
        marginBottom: 8,
    },
    roomName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111",
        textAlign: "center",
    },
    roomSub: {
        marginTop: 2,
        fontSize: 12,
        color: "#6b7280",
        textAlign: "center",
    },
    profileButton: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#d1d5db",
    },
    profileButtonText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#111",
    },
    section: {
        marginTop: 18,
    },
    sectionTitle: {
        paddingHorizontal: 16,
        marginBottom: 4,
        fontSize: 12,
        fontWeight: "500",
        color: "#6b7280",
        textTransform: "uppercase",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },
    rowIcon: {
        marginRight: 10,
    },
    rowTitle: {
        fontSize: 14,
        color: "#111",
    },
    dangerText: {
        color: "#dc2626",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    modalContent: {
        width: "100%",
        borderRadius: 16,
        padding: 16,
        backgroundColor: "#fff",
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111",
        marginBottom: 10,
    },
    modalInput: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#d1d5db",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        color: "#111",
    },
    modalActions: {
        marginTop: 14,
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    modalButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        marginLeft: 8,
    },
    modalCancel: {
        backgroundColor: "#e5e7eb",
    },
    modalPrimary: {
        backgroundColor: "#0a84ff",
    },
    modalCancelText: {
        fontSize: 14,
        color: "#111",
    },
    modalPrimaryText: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "600",
    },
});
