import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
import { useAuth } from "../../stores/auth.store";
import CommentCard from "./CommentCard";

type Props = {
  postId: string;
  onReplyRequested?: (c: Comment) => void;
  onCommentAdded?: (c: Comment) => void;
  onEditRequested?: (c: Comment) => void;
  highlightId?: string | null;
  headerComponent?: React.ReactNode;
};

type ListItem = Comment & { isReply?: boolean };

const getId = (c: Partial<Comment> & { _id?: string; id?: string }) =>
  (c as any).id ?? (c as any)._id;

const normalize = (c: any) => ({ ...c, id: getId(c) });

function CommentList(
  {
    postId,
    onReplyRequested,
    onCommentAdded,
    onEditRequested,
    highlightId,
    headerComponent,
  }: Props,
  ref: any,
) {
  const currentUserId = useAuth((s) => s.user?._id);
  const flatRef = useRef<any>(null);
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
    const id = getId(comment);
    if (!id) return;
    const isOpen = !!expanded[id];

    if (isOpen) {
      setExpanded((s) => ({ ...s, [id]: false }));
      return;
    }

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

  const removeComment = (commentId: string) => {
    setRootComments((list) => list.filter((c) => c.id !== commentId));
    setRepliesCache((s) => {
      const copy = { ...s };
      delete copy[commentId];
      Object.keys(copy).forEach((k) => {
        copy[k] = copy[k].filter((r) => r.id !== commentId);
      });
      return copy;
    });
  };

  const updateComment = (updated: Comment) => {
    setRootComments((list) =>
      list.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    );

    setRepliesCache((s) => {
      const out: Record<string, Comment[]> = {};
      Object.keys(s).forEach((k) => {
        out[k] = s[k].map((r) =>
          r.id === updated.id ? { ...r, ...updated } : r,
        );
      });
      return out;
    });
  };

  useImperativeHandle(ref, () => ({
    addComment: (c: Comment) => {
      // treat as root when parentCommentId is null/undefined
      if (c.parentCommentId == null) {
        setRootComments((s) => [normalize(c), ...s]);
        return;
      }

      const rootId = c.rootCommentId ?? c.parentCommentId;
      if (!rootId) return;

      setRepliesCache((s) => ({
        ...s,
        [rootId]: [...(s[rootId] ?? []), normalize(c)],
      }));

      setRootComments((list) =>
        list.map((rc) =>
          rc.id === rootId
            ? { ...rc, replyCount: (rc.replyCount ?? 0) + 1 }
            : rc,
        ),
      );
    },
    updateComment,
    removeComment,
    scrollToComment: (commentId: string) => {
      if (!commentId) return;

      const data: ListItem[] = [];
      rootComments.forEach((root) => {
        data.push(root);
        if (expanded[root.id]) {
          const replies = repliesCache[root.id] ?? [];
          replies.forEach((r) => data.push({ ...r, isReply: true }));
        }
      });

      const idx = data.findIndex(
        (it) => (it as any).id === commentId || (it as any)._id === commentId,
      );

      if (idx >= 0) {
        try {
          flatRef.current?.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.5,
          });
        } catch {
          // ignore out-of-range
        }
      }
    },
    openThread: async (rootId: string, scrollToId?: string) => {
      if (!rootId) return;

      // if not loaded, load replies
      if (!repliesCache[rootId]) {
        try {
          setLoadingReplies((s) => ({ ...s, [rootId]: true }));
          const res = await commentService.getReplies(postId, rootId);
          const rawReplies = res.data?.replies ?? [];
          const replies = rawReplies.map((r: any) => normalize(r));
          setRepliesCache((s) => ({ ...s, [rootId]: replies }));
        } catch (err: any) {
          // ignore
        } finally {
          setLoadingReplies((s) => ({ ...s, [rootId]: false }));
        }
      }

      setExpanded((s) => ({ ...s, [rootId]: true }));

      if (scrollToId) {
        // Retry scrolling until the item is rendered. This handles slower
        // devices where replies take longer to mount.
        const tryScroll = (attempt = 0) => {
          const data = buildData();
          const idx = data.findIndex(
            (it) =>
              (it as any).id === scrollToId || (it as any)._id === scrollToId,
          );
          if (idx >= 0) {
            try {
              flatRef.current?.scrollToIndex({
                index: idx,
                animated: true,
                viewPosition: 0.5,
              });
              return true;
            } catch {
              return false;
            }
          }

          if (attempt >= 12) return false;
          setTimeout(() => tryScroll(attempt + 1), 150);
          return false;
        };

        const ensureRootLoaded = (attempt = 0) => {
          const hasRoot = rootComments.some(
            (r) => (r as any).id === rootId || (r as any)._id === rootId,
          );
          if (hasRoot) {
            setTimeout(() => tryScroll(), 50);
            return;
          }
          if (attempt >= 12) {
            // final attempt even if root not present
            setTimeout(() => tryScroll(), 50);
            return;
          }
          setTimeout(() => ensureRootLoaded(attempt + 1), 150);
        };

        ensureRootLoaded();
      }
    },
  }));

  const handleCommentAdded = (newComment: Comment) => {
    if (newComment.parentCommentId == null) {
      setRootComments((s) => [normalize(newComment), ...s]);
    } else {
      const rootId = newComment.rootCommentId ?? newComment.parentCommentId;
      if (!rootId) return;

      setRepliesCache((s) => {
        const prev = s[rootId] ?? [];
        return { ...s, [rootId]: [...prev, normalize(newComment)] };
      });

      setRootComments((list) =>
        list.map((c) =>
          c.id === rootId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c,
        ),
      );
    }

    onCommentAdded?.(newComment);
  };

  const handleLongPress = (comment: Comment) => {
    const id = getId(comment);

    const commentUserId =
      typeof comment.userId === "string"
        ? comment.userId
        : ((comment.userId &&
            ((comment.userId as any)._id ?? (comment.userId as any).id)) ??
          undefined);

    const isMine =
      !!currentUserId && !!commentUserId && currentUserId === commentUserId;

    if (isMine) {
      Alert.alert("Chọn hành động", undefined, [
        { text: "Chỉnh sửa", onPress: () => onEditRequested?.(comment) },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await commentService.deleteComment(postId, id);
              removeComment(id);
            } catch (err: any) {
              Alert.alert("Lỗi", err?.message ?? "Không xóa được bình luận");
            }
          },
        },
        { text: "Hủy", style: "cancel" },
      ]);
      return;
    }

    // not mine -> only reply
    Alert.alert("Chọn hành động", undefined, [
      {
        text: "Trả lời",
        onPress: () => onReplyRequested?.(comment),
      },
      { text: "Hủy", style: "cancel" },
    ]);
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
      ref={flatRef}
      data={buildData()}
      keyExtractor={(i) => getId(i)}
      ListHeaderComponent={
        headerComponent ? () => <>{headerComponent}</> : undefined
      }
      renderItem={({ item }) => {
        if (item.isReply) {
          const rid = (item as any).id ?? (item as any)._id;
          return (
            <View style={styles.replyItem}>
              <CommentCard
                comment={item}
                variant="reply"
                onPressReply={() => onReplyRequested?.(item)}
                onLongPress={() => handleLongPress(item)}
                isHighlighted={!!highlightId && highlightId === rid}
              />
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
            onLongPress={() => handleLongPress(item)}
            isHighlighted={!!highlightId && highlightId === id}
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

export default forwardRef(CommentList);
