import { useNotifications } from "@/stores/notification.store";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  notification: any;
  onPress?: (notification: any) => void;
};

const NotificationItem: React.FC<Props> = ({ notification, onPress }) => {
  const markRead = useNotifications((s) => s.markRead);

  const handlePress = () => {
    onPress && onPress(notification);
    if (!notification.isRead) {
      void markRead(String(notification._id));
    }
  };

  const populatedActors: Array<any> = notification.actors || [];
  const lastActor = notification.lastActor || populatedActors[0];

  // Build ordered list with lastActor first, then other actors (no duplicates)
  const otherActors = populatedActors.filter(
    (a: any) => String(a._id) !== String(lastActor?._id),
  );
  const ordered = lastActor ? [lastActor, ...otherActors] : otherActors;

  const namesToShow = (() => {
    if (!ordered || ordered.length === 0) return ["Someone"];
    // Show up to 2 names explicitly, then show `và X người khác` if more
    return ordered.slice(0, 2).map((a: any) => a.username || "Someone");
  })();

  const others = Math.max(
    0,
    (notification.count || ordered.length) - namesToShow.length,
  );

  const actorPart = namesToShow.join(", ");

  const message = (() => {
    switch (notification.type) {
      case "comment":
        return `${actorPart}${others > 0 ? ` và ${others} người khác` : ""} đã bình luận về bài viết của bạn`;
      case "reply":
        return `${actorPart}${others > 0 ? ` và ${others} người khác` : ""} đã trả lời bình luận của bạn`;
      case "like_comment":
        return `${actorPart}${others > 0 ? ` và ${others} người khác` : ""} đã thích bình luận của bạn`;
      case "like_post":
        return `${actorPart}${others > 0 ? ` và ${others} người khác` : ""} đã thích bài viết của bạn`;
      case "mention":
        return `${actorPart}${others > 0 ? ` và ${others} người khác` : ""} đã nhắc đến bạn`;
      default:
        return `${actorPart}${others > 0 ? ` và ${others} người khác` : ""} — ${notification.type || ""}`;
    }
  })();

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <View
        style={[
          styles.container,
          notification.isRead ? styles.read : styles.unread,
        ]}
      >
        <Image
          source={{ uri: lastActor?.avatar || undefined }}
          style={styles.avatar}
        />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {message}
          </Text>
          <Text style={styles.time}>
            {new Date(notification.updatedAt).toLocaleString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  unread: {
    backgroundColor: "#e6f7ff",
  },
  read: {
    backgroundColor: "#ffffff",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ddd",
  },
  body: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: "#111",
  },
  time: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },
});

export default NotificationItem;
