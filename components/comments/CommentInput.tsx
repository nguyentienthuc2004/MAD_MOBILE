import React, { useEffect, useState } from "react";
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
  replyTarget?: Comment | null;
  editTarget?: Comment | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onCommentAdded?: (c: Comment) => void;
  onCommentEdited?: (c: Comment) => void;
};

export default function CommentInput({
  postId,
  replyTarget,
  editTarget,
  onCancelReply,
  onCancelEdit,
  onCommentAdded,
  onCommentEdited,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editTarget) {
      setText(editTarget.content ?? "");
    }
  }, [editTarget]);

  const onSend = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      console.log("CommentInput onSend", {
        postId,
        editTarget,
        replyTarget,
        text,
      });

      if (editTarget) {
        const res = await commentService.editComment(
          postId,
          editTarget.id,
          text.trim(),
        );
        const updated = res.data?.comment;
        setText("");
        if (updated) onCommentEdited?.(updated);
        return;
      }

      let newComment: Comment | undefined;
      if (replyTarget) {
        console.log(
          "Creating reply to",
          replyTarget?.id ?? (replyTarget as any)?._id,
        );
        const res = await commentService.createReply(
          postId,
          replyTarget.id,
          text.trim(),
        );
        newComment = res.data?.comment;
      } else {
        console.log("Creating root comment for post", postId);
        const res = await commentService.createComment(postId, text.trim());
        newComment = res.data?.comment;
      }

      setText("");
      if (newComment) onCommentAdded?.(newComment);
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
      <View style={styles.wrapper}>
        {editTarget ? (
          <View style={styles.replyRow}>
            <Text style={styles.replyText}>{`Đang chỉnh sửa`}</Text>
            <TouchableOpacity
              onPress={() => {
                setText("");
                onCancelEdit?.();
              }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        ) : replyTarget ? (
          <View style={styles.replyRow}>
            <Text
              style={styles.replyText}
            >{`Đang trả lời ${typeof replyTarget.userId === "string" ? replyTarget.userId : replyTarget.userId?.username}`}</Text>
            <TouchableOpacity onPress={onCancelReply} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.container}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={
              editTarget
                ? "Chỉnh sửa bình luận..."
                : replyTarget
                  ? "Trả lời..."
                  : "Viết bình luận..."
            }
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
  wrapper: { backgroundColor: "#fff" },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fbfbfb",
  },
  replyText: { flex: 1, color: "#333", fontSize: 13 },
  cancelBtn: { paddingHorizontal: 8 },
  cancelText: { color: "#ff3b30", fontWeight: "600" },
});
