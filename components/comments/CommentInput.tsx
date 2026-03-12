import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import type { Comment } from "../../services/comment.service";
import commentService from "../../services/comment.service";

type Props = {
  postId: string;
  parentCommentId?: string | null;
  onCommentAdded?: (c: Comment) => void;
};

export default function CommentInput({
  postId,
  parentCommentId,
  onCommentAdded,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      let newComment: Comment | undefined;
      if (parentCommentId) {
        const res = await commentService.createReply(
          postId,
          parentCommentId,
          text.trim(),
        );
        newComment = res.data?.comment;
      } else {
        const res = await commentService.createComment(postId, text.trim());
        newComment = res.data?.comment;
      }

      setText("");
      if (newComment) onCommentAdded?.(newComment);
      Alert.alert("Thành công", "Bình luận đã được gửi");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message ?? "Gửi bình luận thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={parentCommentId ? "Trả lời..." : "Viết bình luận..."}
          style={styles.input}
          multiline
        />

        <TouchableOpacity
          style={styles.sendBtn}
          onPress={onSend}
          disabled={loading}
        >
          <Text style={styles.sendText}>{loading ? "..." : "Gửi"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f7f7f7",
    borderRadius: 20,
  },
  sendBtn: { marginLeft: 8, paddingHorizontal: 12, paddingVertical: 8 },
  sendText: { color: "#007AFF", fontWeight: "600" },
});
