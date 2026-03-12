import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { Comment } from "../../services/comment.service";
import commentService from "../../services/comment.service";
import CommentCard from "./CommentCard";

type Props = {
  postId: string;
  onReplyRequested?: (c: Comment) => void;
  onCommentAdded?: (c: Comment) => void;
};

type ListItem = Comment & { isReply?: boolean };

const getId = (c: Partial<Comment> & { _id?: string; id?: string }) =>
  (c as any).id ?? (c as any)._id;

const normalize = (c: any) => ({ ...c, id: getId(c) });

export default function CommentList({
  postId,
  onReplyRequested,
  onCommentAdded,
}: Props) {
  const [rootComments, setRootComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [repliesCache, setRepliesCache] = useState<Record<string, Comment[]>>(
    {},
  );
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>(
    {},
  );

  const loadRoot = useCallback(async () => {
    try {
      setLoading(true);
      const res = await commentService.getRootComments(postId);
      const raw = res.data?.comments ?? [];
      setRootComments(raw.map((c: any) => normalize(c)));
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message ?? "Không thể tải bình luận");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await commentService.getRootComments(postId);
      const raw = res.data?.comments ?? [];
      setRootComments(raw.map((c: any) => normalize(c)));
      setRepliesCache({});
      setExpanded({});
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message ?? "Không thể tải bình luận");
    } finally {
      setRefreshing(false);
    }
  };

  const toggleReplies = async (comment: Comment) => {
    const id = (comment as any).id ?? (comment as any)._id;
    if (!id) return;
    const isOpen = !!expanded[id];

    if (isOpen) {
      setExpanded((s) => ({ ...s, [id]: false }));
      return;
    }

    // open
    if (repliesCache[id]) {
      setExpanded((s) => ({ ...s, [id]: true }));
      return;
    }

    try {
      setLoadingReplies((s) => ({ ...s, [id]: true }));
      const res = await commentService.getReplies(postId, id);
      const rawReplies = res.data?.replies ?? [];
      const replies = rawReplies.map((r: any) => normalize(r));
      setRepliesCache((s) => ({ ...s, [id]: replies }));
      setExpanded((s) => ({ ...s, [id]: true }));
    } catch (err: any) {
      Alert.alert("Lỗi", "Không tải được câu trả lời");
    } finally {
      setLoadingReplies((s) => ({ ...s, [id]: false }));
    }
  };

  const handleCommentAdded = (newComment: Comment) => {
    if (!newComment.rootCommentId && !newComment.parentCommentId) {
      // root comment
      setRootComments((s) => [normalize(newComment), ...s]);
    } else {
      // reply
      const rootId = newComment.rootCommentId ?? newComment.parentCommentId;
      if (!rootId) return;

      setRepliesCache((s) => {
        const prev = s[rootId] ?? [];
        return { ...s, [rootId]: [normalize(newComment), ...prev] };
      });

      setRootComments((list) =>
        list.map((c) =>
          c.id === rootId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c,
        ),
      );
    }

    onCommentAdded?.(newComment);
  };

  const buildData = (): ListItem[] =>
    rootComments.flatMap((root) => {
      const items: ListItem[] = [root];
      if (expanded[root.id]) {
        const replies = repliesCache[root.id] ?? [];
        items.push(...replies.map((r) => ({ ...r, isReply: true })));
      }
      return items;
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={buildData()}
      keyExtractor={(i) => getId(i)}
      renderItem={({ item }) => {
        if (item.isReply) {
          return (
            <View style={styles.replyItem}>
              <CommentCard comment={item} variant="reply" />
            </View>
          );
        }

        const id = (item as any).id ?? (item as any)._id;
        return (
          <CommentCard
            comment={item}
            onPressReplies={() => toggleReplies(item)}
            onPressReply={() => onReplyRequested?.(item)}
            loadingReplies={!!loadingReplies[id]}
            isExpanded={!!expanded[id]}
          />
        );
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={() => (
        <View style={styles.center}>
          <Text>Chưa có bình luận</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { padding: 20, alignItems: "center", justifyContent: "center" },
  replyItem: {
    paddingLeft: 48,
    backgroundColor: "transparent",
    marginBottom: 8,
  },
});
