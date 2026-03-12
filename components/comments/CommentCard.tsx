import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { Comment } from "../../services/comment.service";

type Props = {
  comment: Comment;
  onPressReplies?: () => void;
  onPressReply?: () => void;
  variant?: "root" | "reply";
  loadingReplies?: boolean;
  isExpanded?: boolean;
};

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

export default function CommentCard({
  comment,
  onPressReplies,
  onPressReply,
  variant = "root",
  loadingReplies = false,
  isExpanded = false,
}: Props) {
  const user = typeof comment.userId === "string" ? null : comment.userId;
  const avatar = user?.avatar;
  const username =
    typeof comment.userId === "string"
      ? String(comment.userId)
      : user?.username || "User";

  return (
    <View style={styles.container}>
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={variant === "reply" ? styles.avatarReply : styles.avatar}
        />
      ) : (
        <View
          style={
            variant === "reply"
              ? [styles.avatarReply, styles.avatarPlaceholder]
              : [styles.avatar, styles.avatarPlaceholder]
          }
        >
          <Text style={styles.avatarLetter}>
            {username?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text
            style={variant === "reply" ? styles.usernameReply : styles.username}
          >
            {username}
          </Text>
          <Text style={variant === "reply" ? styles.timeReply : styles.time}>
            {timeAgo(comment.createdAt)}
          </Text>
        </View>

        <Text style={styles.content}>{comment.content}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={16} color="#444" />
            <Text style={styles.actionText}>Like</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPressReply}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>Trả lời</Text>
          </TouchableOpacity>
        </View>

        {onPressReplies &&
        typeof comment.replyCount === "number" &&
        comment.replyCount > 0 ? (
          <View style={styles.viewRepliesContainer}>
            {loadingReplies ? (
              <ActivityIndicator size="small" />
            ) : isExpanded ? (
              <TouchableOpacity onPress={onPressReplies} activeOpacity={0.7}>
                <Text style={styles.viewRepliesText}>Ẩn câu trả lời</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onPressReplies}
                style={styles.viewReplies}
                activeOpacity={0.7}
              >
                <Text
                  style={styles.viewRepliesText}
                >{`Xem ${comment.replyCount} câu trả lời`}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", padding: 12, alignItems: "flex-start" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eee" },
  avatarReply: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#444", fontWeight: "700" },
  body: { flex: 1, marginLeft: 10 },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  username: { fontWeight: "700", color: "#111" },
  usernameReply: { fontWeight: "700", color: "#111", fontSize: 13 },
  time: { color: "#666", fontSize: 12 },
  timeReply: { color: "#666", fontSize: 12 },
  content: { marginTop: 6, color: "#111" },
  actionsRow: { flexDirection: "row", marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  actionText: { marginLeft: 6, color: "#444", fontSize: 13 },
  viewReplies: { marginTop: 8 },
  viewRepliesContainer: { marginTop: 8 },
  viewRepliesText: { color: "#007AFF", fontSize: 13 },
});
