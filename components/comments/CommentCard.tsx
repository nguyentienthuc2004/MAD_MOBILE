import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
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
  return (
    <Pressable
      onLongPress={onLongPress}
      style={isHighlighted ? [styles.container, styles.highlight] : styles.container}
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

      <View style={variant === "reply" ? styles.likeColumnReply : styles.likeColumn}>
        <TouchableOpacity
          onPress={async () => {
            console.log("CommentCard: like pressed", { id: (comment as any).id ?? (comment as any)._id });
            const id = (comment as any).id ?? (comment as any)._id;
            try {
              const res = await likeService.likeComment(id);
              setLiked(!!res.data?.liked);
              setLikeCount(res.data?.likeCount ?? likeCount);
            } catch (err) {
              // ignore
            }
          }}
          style={styles.likeBtn}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={variant === "reply" ? 16 : 18}
            color={liked ? "#ff3b30" : "#444"}
          />
        </TouchableOpacity>
        <Text style={styles.likeCountText}>{(likeCount ?? 0).toString()}</Text>
      </View>
    </Pressable>
  );
        <Text
          style={[styles.content, isHighlighted && styles.contentHighlighted]}
        >
          {comment.content}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={async () => {
              console.log("CommentCard: like pressed", {
                id: (comment as any).id ?? (comment as any)._id,
              });
              const id = (comment as any).id ?? (comment as any)._id;
              try {
                const res = await likeService.likeComment(id);
                setLiked(!!res.data?.liked);
                setLikeCount(res.data?.likeCount ?? likeCount);
              } catch (err) {
                // ignore
              }
            }}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={16}
              color={liked ? "#ff3b30" : "#444"}
            />
            <Text style={[styles.actionText, liked && styles.likedText]}>
              Like{likeCount ? ` (${likeCount})` : ""}
            </Text>
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
    </Pressable>
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
  contentHighlighted: { fontWeight: "600" },
  usernameHighlighted: { fontWeight: "800" },
  actionsRow: { flexDirection: "row", marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  actionText: { marginLeft: 6, color: "#444", fontSize: 13 },
  likedText: { color: "#ff3b30" },
  viewReplies: { marginTop: 8 },
  viewRepliesContainer: { marginTop: 8 },
  viewRepliesText: { color: "#007AFF", fontSize: 13 },
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
    paddingTop: 4,
  },
  likeBtn: {
    padding: 6,
  },
  likeCountText: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
});
