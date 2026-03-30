import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { Audio, type AVPlaybackStatus } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import likeService from "../services/like.service";
import { useAuth } from "../stores/auth.store";

export type Post = {
  id: string;
  authorId?: string;
  userName: string;
  userAvatar: string;
  images: string[];
  caption: string;
  hashtags?: string[] | string;
  likes: number;
  commentCount?: number;
  createdAt?: string;
  musicUrl?: string;
  isSensitive?: boolean;
};

const isPlaybackInterruptionError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("seeking interrupted") || message.includes("interrupted")
  );
};

const formatPostTime = (createdAt?: string) => {
  if (!createdAt) {
    return "";
  }

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return "";
  }

  const diffMs = Date.now() - createdDate.getTime();

  if (diffMs < 60_000) {
    return "Vừa xong";
  }

  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  return createdDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatHashtagText = (hashtags?: string[] | string) => {
  let rawHashtags: string[] = [];

  if (Array.isArray(hashtags)) {
    rawHashtags = hashtags;
  } else if (typeof hashtags === "string") {
    const trimmed = hashtags.trim();

    if (!trimmed) {
      return "";
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          rawHashtags = parsed.map((item) => String(item ?? ""));
        }
      } catch {
        rawHashtags = [];
      }
    }

    if (rawHashtags.length === 0) {
      rawHashtags = trimmed.split(/[\s,]+/g);
    }
  }

  const cleaned = rawHashtags
    .map((item) => item.trim().replace(/^#+/, ""))
    .filter(Boolean);

  if (cleaned.length === 0) {
    return "";
  }

  return `#${cleaned.join(" #")}`;
};

type PostCardMenuAction = {
  key: string;
  label: string;
  destructive?: boolean;
  onPress?: () => void;
};

type PostCardProps = {
  post: Post;
  sensitiveResetKey?: number;
  liked?: boolean;
  likeCount?: number;
  isActive?: boolean;
  isFeedMuted?: boolean;
  canFollow?: boolean;
  isFollowing?: boolean;
  isOwnPost?: boolean;
  onToggleLike?: () => Promise<void> | void;
  onToggleFeedMuted?: () => void;
  onToggleFollow?: (nextValue: boolean) => void;
  onPressUser?: () => void;
  onPressPost?: () => void;
  onPressMessage?: () => void;
  onPressComment?: () => void;
  onPressEditPost?: () => void;
  onPressDeletePost?: () => void;
  menuActions?: PostCardMenuAction[];
};

export default function PostCard({
  post,
  sensitiveResetKey = 0,
  liked: propLiked,
  likeCount: propLikeCount,
  onToggleLike,
  isActive = true,
  isFeedMuted = true,
  canFollow = true,
  isFollowing: controlledIsFollowing,
  isOwnPost = false,
  onToggleFeedMuted,
  onToggleFollow,
  onPressUser,
  onPressPost,
  onPressMessage,
  onPressComment,
  onPressEditPost,
  onPressDeletePost,
  menuActions,
}: PostCardProps) {
  const isScreenFocused = useIsFocused();
  const [internalIsFollowing, setInternalIsFollowing] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSensitiveRevealed, setIsSensitiveRevealed] = useState(false);
  const imageListDidDragRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = screenWidth;
  const postTimeLabel = formatPostTime(post.createdAt);
  const postHashtagLabel = formatHashtagText(post.hashtags);
  const isSensitiveBlocked = Boolean(post.isSensitive) && !isSensitiveRevealed;
  const canScrollImages = post.images.length > 1 && !isSensitiveBlocked;
  const isFollowing = controlledIsFollowing ?? internalIsFollowing;
  const postId = (post as any).id ?? (post as any)._id ?? (post as any).postId;
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(
    (post as any).likeCount ?? (post as any).likes ?? 0,
  );
  const [isLiking, setIsLiking] = useState(false);
  const effectiveLiked = propLiked ?? localLiked;
  const effectiveLikeCount = propLikeCount ?? localLikeCount;
  const effectiveCommentCount = (post as any).commentCount ?? 0;
  const accessToken = useAuth((s) => s.accessToken);

  useEffect(() => {
    if (propLiked !== undefined) return;

    let mounted = true;
    (async () => {
      try {
        const res = await likeService.checkLikeStatus("post", postId);
        if (!mounted) return;
        setLocalLiked(!!res.data?.liked);
      } catch (err) {}
    })();

    return () => {
      mounted = false;
    };
  }, [postId]);

  useEffect(() => {
    if (propLikeCount !== undefined) return;
    const incoming = (post as any).likeCount ?? (post as any).likes ?? 0;
    setLocalLikeCount(incoming);
  }, [post, (post as any).likeCount, (post as any).likes]);

  const resolvedMenuActions: PostCardMenuAction[] =
    menuActions ??
    (isOwnPost
      ? [
          {
            key: "edit-post",
            label: "Chỉnh sửa bài viết",
            onPress: onPressEditPost,
          },
          {
            key: "delete-post",
            label: "Xóa bài viết",
            destructive: true,
            onPress: onPressDeletePost,
          },
        ]
      : [
          { key: "follow-user", label: "Quan tâm" },
          { key: "unfollow-user", label: "Không quan tâm" },
          { key: "block-user", label: "Chặn người dùng", destructive: true },
        ]);

  const handlePressMenuAction = (action: PostCardMenuAction) => {
    setShowMoreMenu(false);
    action.onPress?.();
  };

  const handleToggleFollow = () => {
    if (!canFollow) {
      return;
    }

    const nextFollowing = !isFollowing;

    if (controlledIsFollowing === undefined) {
      setInternalIsFollowing(nextFollowing);
    }

    onToggleFollow?.(nextFollowing);
  };

  const handleImageScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / imageWidth);
    const maxIndex = Math.max(post.images.length - 1, 0);
    const safeIndex = Math.min(Math.max(newIndex, 0), maxIndex);
    setCurrentImageIndex(safeIndex);
  };

  const handleImageListTouchStart = () => {
    imageListDidDragRef.current = false;
  };

  const handleImageListScrollBeginDrag = () => {
    imageListDidDragRef.current = true;
  };

  const handleImageListScrollEndDrag = () => {
    setTimeout(() => {
      imageListDidDragRef.current = false;
    }, 80);
  };

  const handleImageListTouchEnd = () => {
    if (!onPressPost || isSensitiveBlocked) {
      return;
    }

    if (imageListDidDragRef.current) {
      return;
    }

    onPressPost();
  };

  useEffect(() => {
    setIsSensitiveRevealed(false);
  }, [post.id, sensitiveResetKey]);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync().catch((error) => {
          if (!isPlaybackInterruptionError(error)) {
            console.log("PostCard unload error:", error);
          }
        });
        soundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setIsPlayingMusic(false);
    setIsMusicLoading(false);
    if (soundRef.current) {
      void soundRef.current.unloadAsync().catch((error) => {
        if (!isPlaybackInterruptionError(error)) {
          console.log("PostCard unload on music change error:", error);
        }
      });
      soundRef.current = null;
    }
  }, [post.musicUrl]);

  useEffect(() => {
    const musicUrl = post.musicUrl;

    if (!musicUrl) {
      return;
    }

    let isCancelled = false;

    const syncPlaybackState = async () => {
      if (!isCancelled) {
        setIsMusicLoading(true);
      }

      try {
        if (isFeedMuted || !isActive || !isScreenFocused) {
          if (soundRef.current) {
            await soundRef.current.pauseAsync();
          }

          if (!isCancelled) {
            setIsPlayingMusic(false);
          }
          return;
        }

        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: musicUrl },
            { shouldPlay: true, isMuted: false },
          );

          sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
            if (!status.isLoaded || isCancelled) {
              return;
            }

            setIsPlayingMusic(status.isPlaying);
          });

          soundRef.current = sound;
          if (!isCancelled) {
            setIsPlayingMusic(true);
          }
          return;
        }

        await soundRef.current.setIsMutedAsync(false);
        await soundRef.current.playAsync();

        if (!isCancelled) {
          setIsPlayingMusic(true);
        }
      } catch (error) {
        if (!isPlaybackInterruptionError(error)) {
          console.log("PostCard playback sync error:", error);
        }
      } finally {
        if (!isCancelled) {
          setIsMusicLoading(false);
        }
      }
    };

    void syncPlaybackState();

    return () => {
      isCancelled = true;
    };
  }, [isActive, isFeedMuted, isScreenFocused, post.musicUrl]);

  const handleOpenMusic = async () => {
    if (!post.musicUrl) {
      return;
    }

    onToggleFeedMuted?.();
  };

  const handleLikePost = async () => {
    const id = postId;
    if (!id || isLiking) return;

    if (onToggleLike) {
      try {
        setIsLiking(true);
        await onToggleLike();
      } finally {
        setIsLiking(false);
      }
      return;
    }

    const prevLiked = effectiveLiked;
    const prevLikeCount = effectiveLikeCount ?? 0;
    const nextLiked = !prevLiked;

    if (propLiked === undefined) setLocalLiked(nextLiked);
    if (propLikeCount === undefined)
      setLocalLikeCount(Math.max(0, prevLikeCount + (nextLiked ? 1 : -1)));

    setIsLiking(true);
    try {
      const res = await likeService.likePost(id);
      if (propLiked === undefined) setLocalLiked(!!res.data?.liked);
      if (propLikeCount === undefined)
        setLocalLikeCount(res.data?.likeCount ?? prevLikeCount);
    } catch (err) {
      if (propLiked === undefined) setLocalLiked(prevLiked);
      if (propLikeCount === undefined) setLocalLikeCount(prevLikeCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRevealSensitivePost = () => {
    if (!isSensitiveBlocked) {
      return;
    }

    const handleConfirm = () => {
      if (onPressPost) {
        onPressPost();
        return;
      }

      setIsSensitiveRevealed(true);
    };

    Alert.alert(
      "Nội dung nhạy cảm",
      "Bài viết này có thể chứa hình ảnh không phù hợp với một số người xem. Bạn có muốn tiếp tục không?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xem bài viết",
          onPress: handleConfirm,
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.postHeader}>
        <Pressable
          style={styles.userWrap}
          onPress={onPressUser}
          disabled={!onPressUser}
        >
          <Image source={{ uri: post.userAvatar }} style={styles.userAvatar} />
          <Text style={styles.userName}>{post.userName}</Text>
        </Pressable>
        <View style={styles.headerActions}>
          {!isOwnPost ? (
            <Pressable
              onPress={handleToggleFollow}
              disabled={!canFollow}
              style={[
                styles.followButton,
                !canFollow && styles.followButtonDisabled,
              ]}
            >
              <Text
                style={[styles.followText, isFollowing && styles.followingText]}
              >
                {isFollowing ? "Đang theo dõi" : "Theo dõi"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.imageContainer}>
        <FlatList
          data={post.images}
          horizontal
          pagingEnabled
          scrollEnabled={canScrollImages}
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `${post.id}-${index}`}
          onTouchStart={handleImageListTouchStart}
          onTouchEnd={handleImageListTouchEnd}
          onScrollBeginDrag={handleImageListScrollBeginDrag}
          onScrollEndDrag={handleImageListScrollEndDrag}
          onMomentumScrollEnd={(event) => {
            handleImageScrollEnd(event);
            setTimeout(() => {
              imageListDidDragRef.current = false;
            }, 80);
          }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              blurRadius={isSensitiveBlocked ? 24 : 0}
              style={[styles.postImage, { width: imageWidth }]}
            />
          )}
        />

        {isSensitiveBlocked ? (
          <Pressable
            style={styles.sensitiveOverlay}
            onPress={handleRevealSensitivePost}
          >
            <Ionicons name="eye-off" size={28} color="#fff" />
            <Text style={styles.sensitiveTitle}>Nội dung nhạy cảm</Text>
            <Text style={styles.sensitiveDescription}>
              Chạm để đọc cảnh báo và xem bài viết.
            </Text>
          </Pressable>
        ) : null}

        {post.musicUrl ? (
          <Pressable style={styles.musicToggle} onPress={handleOpenMusic}>
            <Ionicons
              name={
                isMusicLoading
                  ? "sync"
                  : isFeedMuted
                    ? "volume-mute"
                    : "volume-high"
              }
              size={16}
              color="#fff"
            />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={styles.dotsWrap}
        onPress={onPressPost}
        disabled={!onPressPost || isSensitiveBlocked}
      >
        {post.images.map((_, index) => (
          <View
            key={`${post.id}-dot-${index}`}
            style={[
              styles.dot,
              index === currentImageIndex && styles.activeDot,
            ]}
          />
        ))}
      </Pressable>

      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikePost}
            disabled={isLiking}
            activeOpacity={0.7}
          >
            <Ionicons
              name={effectiveLiked ? "heart" : "heart-outline"}
              size={22}
              color={effectiveLiked ? "#E0245E" : "#111"}
            />
            <Text style={styles.actionCount}>
              {(effectiveLikeCount ?? 0).toLocaleString()}
            </Text>
          </TouchableOpacity>

          <Pressable
            style={styles.actionButton}
            onPress={onPressComment ?? onPressMessage}
          >
            <Ionicons name="chatbubble-outline" size={22} color="black" />
            <Text style={styles.actionCount}>
              {(effectiveCommentCount ?? 0).toLocaleString()}
            </Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={onPressMessage}>
            <Ionicons name="paper-plane-outline" size={22} color="black" />
          </Pressable>
        </View>
        <Pressable>
          <Ionicons name="bookmark-outline" size={22} color="black" />
        </Pressable>
      </View>

      {/* Likes count is shown inline next to the like button now */}
      {isSensitiveBlocked ? (
        <Text style={styles.sensitiveCaptionText}>
          Nội dung bài viết đang được ẩn để bảo vệ trải nghiệm xem.
        </Text>
      ) : null}
      {!isSensitiveBlocked ? (
        <>
          <Pressable onPress={onPressPost} disabled={!onPressPost}>
            <Text style={styles.caption} numberOfLines={2}>
              <Text style={styles.captionUser}>{post.userName} </Text>
              {post.caption}
            </Text>
          </Pressable>
          {postHashtagLabel ? (
            <Pressable onPress={onPressPost} disabled={!onPressPost}>
              <Text style={styles.hashtagText} numberOfLines={1}>
                {postHashtagLabel}
              </Text>
            </Pressable>
          ) : null}
          {postTimeLabel ? (
            <Pressable onPress={onPressPost} disabled={!onPressPost}>
              <Text style={styles.postTimeText}>{postTimeLabel}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <Modal
        visible={showMoreMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMoreMenu(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            {resolvedMenuActions.map((action) => (
              <Pressable
                key={action.key}
                style={styles.menuItem}
                onPress={() => handlePressMenuAction(action)}
              >
                <Text
                  style={[
                    styles.menuText,
                    action.destructive && styles.dangerText,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              style={styles.cancelButton}
              onPress={() => setShowMoreMenu(false)}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 18,
  },
  postHeader: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  followButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  followButtonDisabled: {
    opacity: 0.55,
  },
  followText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0095f6",
  },
  followingText: {
    color: "#111",
  },
  moreButton: {
    padding: 2,
  },
  imageContainer: {
    position: "relative",
  },
  sensitiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22,
  },
  sensitiveTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  sensitiveDescription: {
    fontSize: 13,
    textAlign: "center",
    color: "rgba(255,255,255,0.92)",
  },
  postImage: {
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
  },
  musicToggle: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#c7c7c7",
  },
  activeDot: {
    backgroundColor: "#0095f6",
  },
  actionsRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionCount: {
    marginLeft: 6,
    fontSize: 13,
    color: "#111",
    fontWeight: "600",
  },
  actionButton: {
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  likesText: {
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  caption: {
    paddingHorizontal: 12,
    paddingTop: 4,
    fontSize: 13,
    color: "#111",
  },
  captionUser: {
    fontWeight: "600",
  },
  sensitiveCaptionText: {
    paddingHorizontal: 12,
    paddingTop: 6,
    fontSize: 13,
    color: "#6b7280",
  },
  hashtagText: {
    paddingHorizontal: 12,
    paddingTop: 4,
    fontSize: 12,
    color: "#2563eb",
  },
  postTimeText: {
    paddingHorizontal: 12,
    paddingTop: 6,
    fontSize: 11,
    color: "#6b7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  menuItem: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  menuText: {
    fontSize: 16,
    color: "#111",
  },
  dangerText: {
    color: "#ed4956",
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 10,
    marginHorizontal: 10,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
});
