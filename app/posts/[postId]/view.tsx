import BackButton from "@/components/BackButton";
import CommentInput from "@/components/comments/CommentInput";
import CommentList from "@/components/comments/CommentList";
import PostCard, { type Post as FeedPost } from "@/components/PostCard";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import type { Comment } from "@/services/comment.service";
import likeService from "@/services/like.service";
import { postService } from "@/services/post.service";
import { userService, type AppUser } from "@/services/user.service";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FALLBACK_POST_IMAGE = "https://placehold.co/1080x1080?text=Post";

export default function SinglePostView() {
  const params = useLocalSearchParams();
  const postId = String(params.postId ?? "");
  const username = String(params.username ?? "");
  const scrollToCommentId = String(params.scrollToCommentId ?? "");
  const rootCommentId = String(params.rootCommentId ?? "");

  const user = useAuth((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [post, setPost] = useState<any | null>(null);
  const [owner, setOwner] = useState<AppUser | null>(null);
  const [postLiked, setPostLiked] = useState<boolean | null>(null);
  const [postLikeCount, setPostLikeCount] = useState<number | null>(null);
  const commentListRef = useRef<any>(null);
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [editTarget, setEditTarget] = useState<Comment | null>(null);

  useEffect(() => {
    if (!postId) return;

    void (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const res = await postService.getPostById(postId);
        if (res?.data) {
          setPost(res.data);
          setPostLikeCount(res.data?.likeCount ?? null);
        }
        const uid = res?.data?.userId;
        if (uid) {
          try {
            const userRes = await userService.getUserById(String(uid));
            if (userRes?.data) setOwner(userRes.data);
          } catch {}
        }
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true);
          setError("Bài viết không tồn tại hoặc đã bị xóa");
        } else {
          setError(e?.message ?? String(e) ?? "Không tải được bài viết");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await likeService.checkLikeStatus("post", postId);
        if (!mounted) return;
        setPostLiked(!!res.data?.liked);
      } catch (err) {}
    })();

    return () => {
      mounted = false;
    };
  }, [postId]);

  const togglePostLike = async () => {
    if (!postId) return;
    const prev = postLiked ?? false;
    const prevCount = postLikeCount ?? post?.likeCount ?? post?.likes ?? 0;

    setPostLiked(!prev);
    setPostLikeCount(Math.max(0, prevCount + (!prev ? 1 : -1)));

    try {
      const res = await likeService.likePost(postId);
      setPostLiked(!!res.data?.liked);
      setPostLikeCount(res.data?.likeCount ?? prevCount);
    } catch (err) {
      setPostLiked(prev);
      setPostLikeCount(prevCount);
    }
  };

  useEffect(() => {
    if (!postId || !commentListRef) return;

    const tryOpen = (tries = 0) => {
      const ref = commentListRef.current;
      if (ref) {
        const doOpenThread = (rId?: string, sId?: string) => {
          if (typeof ref.openThread === "function") {
            try {
              ref.openThread(rId ?? "", sId ?? undefined);
              return true;
            } catch (err) {}
          }
          return false;
        };

        if (scrollToCommentId && rootCommentId) {
          console.log(
            "[view.tryOpen] both rootCommentId and scrollToCommentId",
            { rootCommentId, scrollToCommentId },
          );
          if (doOpenThread(rootCommentId, scrollToCommentId)) return;
        }

        if (scrollToCommentId) {
          if (typeof ref.openThread === "function") {
            try {
              const { commentService } = require("@/services/comment.service");
              commentService
                .getCommentById(postId, scrollToCommentId)
                .then((r: any) => {
                  const c = r?.data?.comment;
                  const resolvedRoot =
                    c?.rootCommentId ?? c?.parentCommentId ?? c?._id;
                  if (resolvedRoot) {
                    doOpenThread(resolvedRoot, scrollToCommentId);
                  } else {
                    if (typeof ref.scrollToComment === "function") {
                      try {
                        ref.scrollToComment(scrollToCommentId);
                      } catch (err) {}
                    }
                  }
                })
                .catch((err: any) => {});
            } catch (err) {}
          } else if (typeof ref.scrollToComment === "function") {
            try {
              ref.scrollToComment(scrollToCommentId);
              return;
            } catch {}
          }
        }

        if (rootCommentId) {
          if (doOpenThread(rootCommentId, scrollToCommentId || undefined))
            return;
        }
      }

      if (tries < 10) setTimeout(() => tryOpen(tries + 1), 200);
    };

    if (scrollToCommentId || rootCommentId) setTimeout(() => tryOpen(), 200);
  }, [postId, scrollToCommentId, rootCommentId]);

  const handleReplyRequested = (c: Comment) => {
    setReplyTarget(c);
    setEditTarget(null);
  };

  const handleEditRequested = (c: Comment) => {
    setEditTarget(c);
    setReplyTarget(null);
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
    setEditTarget(null);
  };

  const handleCommentAdded = (c: Comment) => {
    try {
      commentListRef.current?.addComment?.(c);

      setReplyTarget(null);
      setEditTarget(null);

      const cid = (c as any).id ?? (c as any)._id;

      if (c.parentCommentId) {
        const rootId = c.rootCommentId ?? c.parentCommentId;
        if (rootId) {
          setTimeout(() => {
            commentListRef.current?.openThread?.(rootId, cid);
          }, 120);
        }
      } else {
        setTimeout(() => {
          if (cid) commentListRef.current?.scrollToComment?.(cid);
        }, 120);
      }
    } catch (err) {}
  };

  const handleCommentEdited = (c: Comment) => {
    try {
      commentListRef.current?.updateComment?.(c);
      setEditTarget(null);

      const cid = (c as any).id ?? (c as any)._id;
      if (cid) {
        setTimeout(() => {
          commentListRef.current?.scrollToComment?.(cid);
        }, 120);
      }
    } catch (err) {}
  };

  const feedPost = useMemo<FeedPost | null>(() => {
    if (!post) return null;

    const meId = user?._id ?? null;
    const displayName =
      post.userDisplayName ??
      post.userName ??
      owner?.displayName ??
      owner?.username ??
      post.userId ??
      "Người dùng";
    const avatarUrl = post.userAvatarUrl ?? owner?.avatarUrl ?? "";

    return {
      id: post._id,
      userName: displayName,
      userAvatar: avatarUrl || FALLBACK_POST_IMAGE,
      images: post.images?.length ? post.images : [FALLBACK_POST_IMAGE],
      caption: post.caption ?? "",
      hashtags: post.hashtags ?? [],
      likes: post.likeCount ?? 0,
      createdAt: post.createdAt,
      musicUrl: post.musicId ?? undefined,
      isSensitive: Boolean(post.isSensitive),
    };
  }, [post, user?._id, owner]);

  const headerComponent = React.useMemo(() => {
    if (!feedPost) return null;
    return (
      <PostCard
        post={feedPost}
        liked={postLiked ?? undefined}
        likeCount={postLikeCount ?? undefined}
        onToggleLike={togglePostLike}
        isActive={true}
        isOwnPost={String(post.userId) === String(user?._id)}
        onPressComment={() => {}}
      />
    );
  }, [
    feedPost,
    post?.userId,
    user?._id,
    postLiked,
    postLikeCount,
    togglePostLike,
  ]);

  return (
    <>
      <Stack.Screen
        options={{
          title:
            owner?.displayName ??
            owner?.username ??
            feedPost?.userName ??
            "Bài viết",
        }}
      />

      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <BackButton href="/(tabs)/notification" />
          <Text style={styles.title}>
            {owner?.displayName ??
              owner?.username ??
              feedPost?.userName ??
              "Bài viết"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading && !post ? (
          <Text style={styles.stateText}>Đang tải...</Text>
        ) : null}
        {error ? <Text style={styles.stateText}>{String(error)}</Text> : null}

        {feedPost ? (
          <>
            <CommentList
              ref={commentListRef}
              postId={postId}
              highlightId={scrollToCommentId || rootCommentId || null}
              headerComponent={headerComponent}
              onReplyRequested={handleReplyRequested}
              onEditRequested={handleEditRequested}
              onCommentAdded={handleCommentAdded}
            />

            <CommentInput
              postId={postId}
              replyTarget={replyTarget}
              editTarget={editTarget}
              onCancelReply={handleCancelReply}
              onCommentAdded={handleCommentAdded}
              onCommentEdited={handleCommentEdited}
            />
          </>
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#111" },
  headerSpacer: { width: 36, height: 36 },
  stateText: { padding: 16, color: "#6b7280" },
  postWrap: { flex: 1 },
  comments: { flex: 1 },
});
