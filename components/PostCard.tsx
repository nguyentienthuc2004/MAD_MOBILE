import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export type Post = {
  id: string;
  userName: string;
  userAvatar: string;
  images: string[];
  caption: string;
  likes: number;
  musicUrl?: string;
};

type PostCardProps = {
  post: Post;
  isActive?: boolean;
  isFeedMuted?: boolean;
  onToggleFeedMuted?: () => void;
  onPressMessage?: () => void;
  onPressComment?: () => void;
};

export default function PostCard({
  post,
  isActive = true,
  isFeedMuted = true,
  onToggleFeedMuted,
  onPressMessage,
  onPressComment,
}: PostCardProps) {
  const isScreenFocused = useIsFocused();
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = screenWidth;

  const menuActions = ["Quan tâm", "Không quan tâm", "Chặn người dùng"];

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
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setIsPlayingMusic(false);
    if (soundRef.current) {
      void soundRef.current.unloadAsync();
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
      if (isFeedMuted || !isActive || !isScreenFocused) {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
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

      await soundRef.current.setPositionAsync(0);
      await soundRef.current.setIsMutedAsync(false);
      await soundRef.current.playAsync();

      if (!isCancelled) {
        setIsPlayingMusic(true);
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

  return (
    <View style={styles.card}>
      <View style={styles.postHeader}>
        <View style={styles.userWrap}>
          <Image source={{ uri: post.userAvatar }} style={styles.userAvatar} />
          <Text style={styles.userName}>{post.userName}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setIsFollowing((prev) => !prev)}
            style={styles.followButton}
          >
            <Text
              style={[styles.followText, isFollowing && styles.followingText]}
            >
              {isFollowing ? "Đang theo dõi" : "Theo dõi"}
            </Text>
          </Pressable>
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
          <Pressable style={styles.actionButton}>
            <Ionicons name="heart-outline" size={24} color="black" />
          </Pressable>
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

      <Text style={styles.likesText}>{post.likes.toLocaleString()} likes</Text>
      <Text style={styles.caption} numberOfLines={2}>
        <Text style={styles.captionUser}>{post.userName} </Text>
        {post.caption}
      </Text>

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
            {menuActions.map((action) => (
              <Pressable
                key={action}
                style={styles.menuItem}
                onPress={() => setShowMoreMenu(false)}
              >
                <Text
                  style={[
                    styles.menuText,
                    action === "Báo cáo" && styles.dangerText,
                  ]}
                >
                  {action}
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
    padding: 2,
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
