import { useNotifications } from "@/stores/notification.store";
import React, { useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import NotificationItem from "./NotificationItem";

const NotificationsList: React.FC = () => {
  const notifications = useNotifications((s) => s.notifications);
  const refresh = useNotifications((s) => s.refresh);
  const loading = useNotifications((s) => s.loading);

  useEffect(() => {
    void refresh();
  }, []);

  if (!notifications || !notifications.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Không có thông báo</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => String(item._id)}
      renderItem={({ item }) => <NotificationItem notification={item} />}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void refresh()} />
      }
    />
  );
};

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: { color: "#666" },
});

export default NotificationsList;
