import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { Audio, type AVPlaybackStatus } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import {
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
  likes: number;
  createdAt?: string;
  musicUrl?: string;
};

const isPlaybackInterruptionError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("seeking interrupted") || message.includes("interrupted");
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

type PostCardMenuAction = {
  key: string;
  label: string;
  destructive?: boolean;
  onPress?: () => void;
};

type PostCardProps = {
  post: Post;
  isActive?: boolean;
  isFeedMuted?: boolean;
  canFollow?: boolean;
  isFollowing?: boolean;
  isOwnPost?: boolean;
  onToggleFeedMuted?: () => void;
  onToggleFollow?: (nextValue: boolean) => void;
  onPressUser?: () => void;
  onPressMessage?: () => void;
  onPressComment?: () => void;
  onPressEditPost?: () => void;
  onPressDeletePost?: () => void;
  menuActions?: PostCardMenuAction[];
};

export default function PostCard({
  post,
  isActive = true,
  isFeedMuted = true,
  canFollow = true,
  isFollowing: controlledIsFollowing,
  isOwnPost = false,
  onToggleFeedMuted,
  onToggleFollow,
  onPressUser,
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = screenWidth;
  const postTimeLabel = formatPostTime(post.createdAt);
  const isFollowing = controlledIsFollowing ?? internalIsFollowing;
  const postId = (post as any).id ?? (post as any)._id ?? (post as any).postId;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(
    (post as any).likeCount ?? (post as any).likes ?? 0,
  );
  const [isLiking, setIsLiking] = useState(false);
  const accessToken = useAuth((s) => s.accessToken);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await likeService.checkLikeStatus("post", postId);
        if (!mounted) return;
        setLiked(!!res.data?.liked);
      } catch (err) {}
    })();

    return () => {
      mounted = false;
    };
  }, [postId]);

  useEffect(() => {
    const incoming = (post as any).likeCount ?? (post as any).likes ?? 0;
    setLikeCount(incoming);
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
    if (!id || isLiking) {
      return;
    }

    const prevLiked = liked;
    const prevLikeCount = likeCount ?? 0;
    const nextLiked = !prevLiked;

    // Optimistic update: toggle visual state immediately
    setLiked(nextLiked);
    setLikeCount(Math.max(0, prevLikeCount + (nextLiked ? 1 : -1)));
    setIsLiking(true);

    try {
      const res = await likeService.likePost(id);

      setLiked(!!res.data?.liked);
      setLikeCount(res.data?.likeCount ?? prevLikeCount);
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevLikeCount);
    } finally {
      setIsLiking(false);
    }
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
          <Pressable
            onPress={() => setShowMoreMenu(true)}
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="black" />
          </Pressable>
        </View>
      </View>

      <View style={styles.imageContainer}>
        <FlatList
          data={post.images}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `${post.id}-${index}`}
          onMomentumScrollEnd={handleImageScrollEnd}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={[styles.postImage, { width: imageWidth }]}
            />
          )}
        />

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

      <View style={styles.dotsWrap}>
        {post.images.map((_, index) => (
          <View
            key={`${post.id}-dot-${index}`}
            style={[
              styles.dot,
              index === currentImageIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikePost}
            disabled={isLiking}
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#E0245E" : "#111"}
            />
          </TouchableOpacity>
          <Pressable
            style={styles.actionButton}
            onPress={onPressComment ?? onPressMessage}
          >
            <Ionicons name="chatbubble-outline" size={22} color="black" />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onPressMessage}>
            <Ionicons name="paper-plane-outline" size={22} color="black" />
          </Pressable>
        </View>
        <Pressable>
          <Ionicons name="bookmark-outline" size={22} color="black" />
        </Pressable>
      </View>

      <Text style={styles.likesText}>
        {(likeCount ?? 0).toLocaleString()} likes
      </Text>
      <Text style={styles.caption} numberOfLines={2}>
        <Text style={styles.captionUser}>{post.userName} </Text>
        {post.caption}
      </Text>
      {postTimeLabel ? (
        <Text style={styles.postTimeText}>{postTimeLabel}</Text>
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
  actionButton: {
    padding: 8,
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
