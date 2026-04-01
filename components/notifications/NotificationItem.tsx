import { useNotifications } from "@/stores/notification.store";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  notification: any;
  onPress?: (notification: any) => void;
};

const NotificationItem: React.FC<Props> = ({ notification, onPress }) => {
  const markRead = useNotifications((s) => s.markRead);
  const markUnread = useNotifications((s) => (s as any).markUnread);
  const [menuVisible, setMenuVisible] = useState(false);

  const handlePress = () => {
    onPress && onPress(notification);
    if (!notification.isRead) {
      void markRead(String(notification._id));
    }
  };

  const handleMarkUnread = async () => {
    setMenuVisible(false);
    if (notification.isRead) {
      try {
        await markUnread(String(notification._id));
      } catch (e) {
        console.error("mark unread failed", e);
      }
    }
  };

  const populatedActors: Array<any> = notification.actors || [];
  const lastActor = notification.lastActor || populatedActors[0];

  const avatarUri =
    lastActor?.avatar || lastActor?.avatarUrl || lastActor?.avatar?.url;

  const otherActors = populatedActors.filter(
    (a: any) => String(a._id) !== String(lastActor?._id),
  );
  const ordered = lastActor ? [lastActor, ...otherActors] : otherActors;

  const namesToShow = (() => {
    if (!ordered || ordered.length === 0) return ["Someone"];

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
          menuVisible ? styles.containerActive : null,
        ]}
      >
        <Image
          source={avatarUri ? { uri: avatarUri } : undefined}
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
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setMenuVisible((v) => !v)}>
            <Text style={styles.menuTrigger}>⋯</Text>
          </TouchableOpacity>
          {menuVisible && notification.isRead ? (
            <View style={styles.menu}>
              <TouchableOpacity
                onPress={handleMarkUnread}
                style={styles.menuItem}
              >
                <Text style={styles.menuText}>Đánh dấu là chưa đọc</Text>
              </TouchableOpacity>
            </View>
          ) : null}
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
    overflow: "visible",
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
  actions: {
    marginLeft: 8,
    alignItems: "flex-end",
    overflow: "visible",
  },
  menuTrigger: {
    fontSize: 20,
    color: "#666",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  menu: {
    position: "absolute",
    right: 36,
    top: -4,
    backgroundColor: "#fff",
    borderRadius: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 160,
    zIndex: 999,
    overflow: "visible",
  },
  containerActive: {
    zIndex: 1000,
    elevation: 10,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuText: {
    color: "#111",
    flexShrink: 1,
    flexWrap: "wrap",
  },
});

export default NotificationItem;
