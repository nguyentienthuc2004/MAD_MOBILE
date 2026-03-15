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
  View,
} from "react-native";

const NotificationScreen: React.FC = () => {
  const unread = useNotifications((s) => s.unreadCount);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <NotificationBadge count={unread} />
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
  listWrap: { flex: 1 },
});

export default NotificationScreen;
