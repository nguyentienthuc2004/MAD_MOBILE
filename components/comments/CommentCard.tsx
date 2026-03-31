import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Comment } from "../../services/comment.service";
import likeService from "../../services/like.service";

type Props = {
  comment: Comment;
  variant?: "reply" | "root";
  onPressReply?: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  onPressReplies?: () => void;
  isExpanded?: boolean;
  loadingReplies?: boolean;
  isHighlighted?: boolean;
};

function timeAgo(datestr?: string) {
  if (!datestr) return "";
  const t = Date.now() - new Date(datestr).getTime();
  const s = Math.floor(t / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function CommentCard({
  comment,
  variant,
  onPressReply,
  onLongPress,
  onPressReplies,
  onPress,
  isExpanded,
  loadingReplies,
  isHighlighted,
}: Props) {
  const username = (comment as any).userId?.username ?? "User";
  const owner = (comment as any).userId || {};
  const avatar = owner?.avatar || owner?.avatarUrl || owner?.avatar?.url;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number | undefined>(
    (comment as any).likeCount ?? undefined,
  );

  const mountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = (comment as any).id ?? (comment as any)._id;
        const [statusRes, countRes] = await Promise.all([
          likeService.checkLikeStatus("comment", id),
          likeService.getCommentLikes(id).catch(() => null),
        ]);

        if (mounted) setLiked(!!statusRes.data?.liked);
        if (mounted && countRes?.data?.total != null) {
          setLikeCount(countRes.data.total);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [comment]);

  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: variant === "reply" ? 320 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [variant, mountAnim]);

  async function handleLike() {
    const id = (comment as any).id ?? (comment as any)._id;
    try {
      const res = await likeService.likeComment(id);
      setLiked(!!res.data?.liked);
      setLikeCount(res.data?.likeCount ?? likeCount);
    } catch (err) {
      // ignore
    }
  }

  const wrapperStyle =
    variant === "reply"
      ? [
          {
            transform: [
              {
                translateY: mountAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
            opacity: mountAnim,
          },
        ]
      : undefined;

  return (
    <Animated.View style={wrapperStyle}>
      <Pressable
        onLongPress={onLongPress}
        onPress={onPress}
        style={
          isHighlighted
            ? [
                variant === "reply" ? styles.containerReply : styles.container,
                styles.highlight,
              ]
            : variant === "reply"
              ? styles.containerReply
              : styles.container
        }
      >
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
              style={[
                variant === "reply" ? styles.usernameReply : styles.username,
                isHighlighted && styles.usernameHighlighted,
              ]}
              numberOfLines={1}
            >
              {username}
            </Text>
            <Text style={variant === "reply" ? styles.timeReply : styles.time}>
              {timeAgo(comment.createdAt)}
            </Text>
          </View>

          <Text
            style={[styles.content, isHighlighted && styles.contentHighlighted]}
            numberOfLines={2}
          >
            {comment.content}
          </Text>

          <View
            style={
              variant === "reply" ? styles.actionsRowReply : styles.actionsRow
            }
          >
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
                  style={styles.viewRepliesRow}
                  activeOpacity={0.7}
                >
                  <View style={styles.viewRepliesLine} />
                  <Text
                    style={styles.viewRepliesText}
                  >{`Xem ${comment.replyCount} câu trả lời khác`}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        <View
          style={
            variant === "reply" ? styles.likeColumnReply : styles.likeColumn
          }
        >
          <TouchableOpacity onPress={handleLike} style={styles.likeBtn}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={variant === "reply" ? 16 : 18}
              color={liked ? "#ff3b30" : "#444"}
            />
          </TouchableOpacity>
          <Text style={styles.likeCountText}>
            {(likeCount ?? 0).toString()}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
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
    justifyContent: "flex-start",
  },
  username: { fontWeight: "700", color: "#111", flexShrink: 1 },
  usernameReply: { fontWeight: "700", color: "#111", fontSize: 13 },
  time: { color: "#666", fontSize: 12, marginLeft: 8 },
  timeReply: { color: "#666", fontSize: 12 },
  content: { marginTop: 6, color: "#111" },
  contentHighlighted: { fontWeight: "600" },
  usernameHighlighted: { fontWeight: "800" },
  actionsRow: { flexDirection: "row", marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  actionText: { marginLeft: 0, color: "#444", fontSize: 13 },
  likedText: { color: "#ff3b30" },
  viewReplies: { marginTop: 8 },
  viewRepliesContainer: { marginTop: 6 },
  viewRepliesRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  viewRepliesLine: {
    width: 24,
    height: 2,
    backgroundColor: "#c7c7c7",
    marginRight: 8,
  },
  viewRepliesText: { color: "#6b7280", fontSize: 13 },
  highlight: {
    backgroundColor: "rgba(0,122,255,0.03)",
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
    paddingLeft: 9,
  },
  likeColumn: {
    width: 48,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 6,
  },
  likeColumnReply: {
    width: 40,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  likeBtn: {
    padding: 6,
  },
  likeCountText: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
  containerReply: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  contentReply: { marginTop: 4 },
  actionsRowReply: { flexDirection: "row", marginTop: 6 },
});
