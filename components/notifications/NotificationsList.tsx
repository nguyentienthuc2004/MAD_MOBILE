import { useNotifications } from "@/stores/notification.store";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import NotificationItem from "./NotificationItem";

const NotificationsList: React.FC = () => {
  const notifications = useNotifications((s) => s.notifications);
  const refresh = useNotifications((s) => s.refresh);
  const loading = useNotifications((s) => s.loading);
  const router = useRouter();

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
      renderItem={({ item }) => (
        <NotificationItem
          notification={item}
          onPress={(n) => {
            const extractId = (val: any) => {
              if (!val && val !== 0) return "";
              if (typeof val === "string") return val;
              if (typeof val === "number") return String(val);
              if (typeof val === "object") {
                if (val._id) return String(val._id);
                if (val.id) return String(val.id);
                if (val.post && (val.post._id || val.post.id))
                  return String(val.post._id ?? val.post.id);
                return "";
              }
              return "";
            };

            const rawPost =
              n &&
              (n.targetPostId ??
                n.data?.postId ??
                n.data?.targetPostId ??
                n.data?.post);
            const postId = extractId(rawPost);

            const rawComment =
              n &&
              (n.targetCommentId ??
                n.data?.commentId ??
                n.data?.targetCommentId ??
                n.data?.comment);
            const commentId = extractId(rawComment);

            const rawRoot = n && (n.data?.rootCommentId ?? n.data?.rootId);
            const rootId = extractId(rawRoot);

            if (postId) {
              const params: any = { postId };
              if (commentId) params.scrollToCommentId = commentId;
              if (rootId) params.rootCommentId = rootId;

              void router.push({ pathname: "/posts/[postId]/view", params });
            }
          }}
        />
      )}
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
