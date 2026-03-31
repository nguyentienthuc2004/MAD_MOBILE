import NotificationBadge from "@/components/notifications/NotificationBadge";
import NotificationsList from "@/components/notifications/NotificationsList";
import { useNotifications } from "@/stores/notification.store";
import React from "react";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const NotificationScreen: React.FC = () => {
  const unread = useNotifications((s) => s.unreadCount);
  const markAll = useNotifications((s) => s.markAllRead);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.markAllBtn}
          onPress={() => void markAll()}
        >
          <Text style={styles.markAllText}>Đánh dấu tất cả là đã đọc</Text>
          <View style={styles.badgeWrap} pointerEvents="none">
            <NotificationBadge count={unread} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.listWrap}>
        <NotificationsList />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 12) : 0,
  },
  header: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    position: "relative",
  },
  markAllText: { fontSize: 13, fontWeight: "600", color: "#333" },
  badgeWrap: { position: "absolute", top: -6, right: -6 },
  listWrap: { flex: 1 },
});

export default NotificationScreen;
