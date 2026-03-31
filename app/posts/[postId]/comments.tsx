import BackButton from "@/components/BackButton";
import CommentInput from "@/components/comments/CommentInput";
import CommentList from "@/components/comments/CommentList";
import type { Comment } from "@/services/comment.service";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommentsRoute() {
  const params = useLocalSearchParams();
  const postId = String(params.postId ?? "");
  const username = String(params.username ?? "");
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [editTarget, setEditTarget] = useState<Comment | null>(null);
  const listRef = useRef<any>(null);

  const handleReplyRequested = async (comment: Comment) => {
    const commentId = (comment as any).id ?? (comment as any)._id;
    const rootId = (comment as any).rootCommentId ?? commentId;

    if (rootId) {
      // open the root thread (loads replies if needed) and scroll to the comment
      await listRef.current?.openThread(rootId, commentId);
    }

    setReplyTarget(comment);
  };
  const handleEditRequested = (comment: Comment) => setEditTarget(comment);

  const handleCommentAdded = (c: Comment) => {
    // insert into list optimistically
    listRef.current?.addComment(c);
    setReplyTarget(null);
    setEditTarget(null);
  };

  const handleCommentEdited = (c: Comment) => {
    listRef.current?.updateComment(c);
    setEditTarget(null);
  };

  return (
    <>
      <Stack.Screen options={{ title: "Bình luận" }} />

      <SafeAreaView style={styles.full} edges={["top"]}>
        <View style={styles.header}>
          <BackButton href="/(tabs)/home" />
          <Text style={styles.title}>{`Bài viết của ${username}`}</Text>
        </View>

        <View style={styles.list}>
          <CommentList
            ref={listRef}
            postId={postId}
            onReplyRequested={handleReplyRequested}
            onEditRequested={handleEditRequested}
            onCommentAdded={handleCommentAdded}
            // highlight the comment being replied to
            highlightId={replyTarget?.id}
          />
        </View>

        <CommentInput
          postId={postId}
          replyTarget={replyTarget ?? undefined}
          editTarget={editTarget ?? undefined}
          onCancelReply={() => setReplyTarget(null)}
          onCancelEdit={() => setEditTarget(null)}
          onCommentAdded={handleCommentAdded}
          onCommentEdited={handleCommentEdited}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 52,
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
