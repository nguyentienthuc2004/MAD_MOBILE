import BackButton from "@/components/BackButton";
import CommentInput from "@/components/comments/CommentInput";
import CommentList from "@/components/comments/CommentList";
import type { Comment } from "@/services/comment.service";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CommentsRoute() {
  const params = useLocalSearchParams();
  const postId = String(params.postId ?? "");
  const username = String(params.username ?? "");
  const [replyTo, setReplyTo] = useState<string | null | undefined>(undefined);

  const handleReplyRequested = (comment: Comment) => setReplyTo(comment.id);
  const handleCommentAdded = (_c: Comment) => setReplyTo(undefined);

  return (
    <>
      <Stack.Screen options={{ title: "Bình luận" }} />

      <View style={styles.full}>
        <View style={styles.header}>
          <BackButton href="/(tabs)/home" />
          <Text style={styles.title}>{`Bài viết của ${username}`}</Text>
        </View>

        <View style={styles.list}>
          <CommentList
            postId={postId}
            onReplyRequested={handleReplyRequested}
            onCommentAdded={handleCommentAdded}
          />
        </View>

        <CommentInput
          postId={postId}
          parentCommentId={replyTo ?? undefined}
          onCommentAdded={handleCommentAdded}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  title: { flex: 1, textAlign: "center", fontWeight: "700" },
  list: { flex: 1 },
});
