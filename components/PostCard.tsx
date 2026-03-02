import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
};

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = screenWidth;

  const menuActions = [
    "Quan tâm",
    "Không quan tâm",
    "Chặn người dùng",
  ];

  const handleImageScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / imageWidth);
    const maxIndex = Math.max(post.images.length - 1, 0);
    const safeIndex = Math.min(Math.max(newIndex, 0), maxIndex);
    setCurrentImageIndex(safeIndex);
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
            <Text style={[styles.followText, isFollowing && styles.followingText]}>
              {isFollowing ? "Đang theo dõi" : "Theo dõi"}
            </Text>
          </Pressable>
          <Pressable onPress={() => setShowMoreMenu(true)} style={styles.moreButton}>
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
            <Image source={{ uri: item }} style={[styles.postImage, { width: imageWidth }]} />
          )}
        />

        <Pressable style={styles.musicToggle} onPress={() => setIsMuted((prev) => !prev)}>
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={16}
            color="#fff"
          />
        </Pressable>
      </View>

      <View style={styles.dotsWrap}>
        {post.images.map((_, index) => (
          <View
            key={`${post.id}-dot-${index}`}
            style={[styles.dot, index === currentImageIndex && styles.activeDot]}
          />
        ))}
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <Pressable style={styles.actionButton}>
            <Ionicons name="heart-outline" size={24} color="black" />
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color="black" />
          </Pressable>
          <Pressable style={styles.actionButton}>
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
        <Pressable style={styles.modalOverlay} onPress={() => setShowMoreMenu(false)}>
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            {menuActions.map((action) => (
              <Pressable
                key={action}
                style={styles.menuItem}
                onPress={() => setShowMoreMenu(false)}
              >
                <Text
                  style={[styles.menuText, action === "Báo cáo" && styles.dangerText]}
                >
                  {action}
                </Text>
              </Pressable>
            ))}

            <Pressable style={styles.cancelButton} onPress={() => setShowMoreMenu(false)}>
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
