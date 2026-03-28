import { type Post as FeedPost } from "@/components/PostCard";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { chatService } from "@/services/chat.service";
import { checkFollowStatus } from "@/services/checkFollowStatus";
import { followService } from "@/services/follow.service";
import { type Post as ApiPost, postService } from "@/services/post.service";
import { type AppUser, userService } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GRID_GAP = 2;
const GRID_ITEM_SIZE = (Dimensions.get("window").width - GRID_GAP * 2) / 3;
const FALLBACK_POST_IMAGE = "https://placehold.co/1080x1080?text=Post";
const FALLBACK_AVATAR_URL = "https://placehold.co/200x200?text=User";

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const targetUserId = typeof userId === "string" ? userId : "";
  console.log("[UserProfileScreen] params.userId:", userId, "targetUserId:", targetUserId);

  const me = useAuth((state) => state.user);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  const { request, loading, error } = useApi<{
    user: AppUser;
    posts: ApiPost[];
  }>();
  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [revealedSensitiveByPostId, setRevealedSensitiveByPostId] = useState<
    Record<string, boolean>
  >({});

  const fetchUserProfile = useCallback(async () => {

    if (!targetUserId) {
      setProfileUser(null);
      setPosts([]);
      return;
    }

    if (targetUserId === me?._id) {
      void router.replace("/(tabs)/profile");
      return;
    }

    console.log("[UserProfileScreen] Fetching profile for:", targetUserId);
    const res = await request(async () => {
      const [userRes, postsRes] = await Promise.all([
        userService.getUserById(targetUserId),
        postService.getPostsByUserId(targetUserId),
      ]);

      return {
        user: userRes.data,
        posts: postsRes.data ?? [],
      };
    });

    if (!res) {
      return;
    }

    setProfileUser(res.user);
    setPosts(res.posts);
    setRevealedSensitiveByPostId({});
    setFollowerCount(res.user.followerCount ?? null);
    setFollowingCount(res.user.followingCount ?? null);
  }, [me?._id, request, router, targetUserId]);

  useEffect(() => {
    void fetchUserProfile();
  }, [fetchUserProfile]);

  // Kiểm tra trạng thái follow khi vào trang cá nhân
  useEffect(() => {
    const check = async () => {
      if (!me?._id || !targetUserId || me._id === targetUserId) {
        setIsFollowing(false);
        console.log("[FollowStatus] Skip check: me?._id:", me?._id, "targetUserId:", targetUserId);
        return;
      }
      try {
        const res = await checkFollowStatus(targetUserId);
        console.log("[FollowStatus] API response:", res);
        setIsFollowing(!!res.isFollowing);
      } catch (err) {
        setIsFollowing(false);
        console.log("[FollowStatus] Error:", err);
      }
    };
    check();
  }, [me?._id, targetUserId]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchUserProfile();
    } finally {
      setRefreshing(false);
    }
  }, [fetchUserProfile]);

  const feedPosts = useMemo<FeedPost[]>(() => {
    const displayName =
      profileUser?.displayName || profileUser?.username || "Người dùng";
    const avatarUrl = profileUser?.avatarUrl || FALLBACK_AVATAR_URL;

    return posts.map((post) => ({
      id: post._id,
      authorId: post.userId,
      userName: displayName,
      userAvatar: avatarUrl,
      images: post.images?.length ? post.images : [FALLBACK_POST_IMAGE],
      caption: post.caption ?? "",
      likes: post.likeCount ?? 0,
      createdAt: post.createdAt,
      isSensitive: Boolean(post.isSensitive),
    }));
  }, [posts, profileUser?.avatarUrl, profileUser?.displayName, profileUser?.username]);

  const displayName =
    profileUser?.displayName || profileUser?.username || "Người dùng";
  const bio = profileUser?.bio || "";
  const avatarUrl = profileUser?.avatarUrl || FALLBACK_AVATAR_URL;

  const handleOpenPost = (postId: string) => {
    void router.push({
      pathname: "/post-detail",
      params: {
        postId,
        userId: targetUserId,
        displayName,
        avatarUrl,
      },
    });
  };

  const handlePressGridPost = (item: FeedPost) => {
    const isBlocked =
      Boolean(item.isSensitive) && !revealedSensitiveByPostId[item.id];

    if (!isBlocked) {
      handleOpenPost(item.id);
      return;
    }

    Alert.alert(
      "Nội dung nhạy cảm",
      "Bài viết này có thể chứa hình ảnh không phù hợp với một số người xem. Bạn có muốn tiếp tục không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xem bài viết",
          onPress: () => {
            setRevealedSensitiveByPostId((prev) => ({
              ...prev,
              [item.id]: true,
            }));
            handleOpenPost(item.id);
          },
        },
      ],
    );
  };

  const handleToggleFollow = async () => {
    if (!isAuthenticated || !me?._id) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để theo dõi.");
      return;
    }

    if (!isFollowing) {
      // Đang chưa follow, gọi API tạo follow
      try {
        const res = await followService.followUser(targetUserId);
        setIsFollowing(true);
        if (res && res.following && typeof res.following.followerCount === 'number') {
          setFollowerCount(res.following.followerCount);
        }
        if (res && res.following && typeof res.following.followingCount === 'number') {
          setFollowingCount(res.following.followingCount);
        }
        Alert.alert("Thành công", "Bạn đã theo dõi người này.");
      } catch (err: any) {
        Alert.alert("Lỗi", err?.message || "Không thể theo dõi.");
      }
    } else {
      // Đang theo dõi, xác nhận hủy theo dõi
      Alert.alert(
        "Xác nhận",
        "Bạn có chắc muốn hủy theo dõi người này?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Hủy theo dõi",
            style: "destructive",
            onPress: async () => {
              try {
                const res = await followService.unfollowUser(targetUserId);
                setIsFollowing(false);
                if (res && res.following && typeof res.following.followerCount === 'number') {
                  setFollowerCount(res.following.followerCount);
                }
                if (res && res.following && typeof res.following.followingCount === 'number') {
                  setFollowingCount(res.following.followingCount);
                }
                Alert.alert("Đã hủy theo dõi", "Bạn đã hủy theo dõi người này.");
              } catch (err: any) {
                Alert.alert("Lỗi", err?.message || "Không thể hủy theo dõi.");
              }
            },
          },
        ]
      );
    }
  };

  const handleOpenMessage = async () => {
    if (!targetUserId) {
      return;
    }

    try {
      const res = await chatService.createRoom(targetUserId);
      const room = res.data?.room;

      if (!room?._id) {
        throw new Error("Không nhận được phòng chat");
      }

      router.push({
        pathname: "/(chats)/[roomId]",
        params: { roomId: room._id },
      });
    } catch (chatError: any) {
      Alert.alert("Lỗi", chatError?.message || "Không mở được phòng chat");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.headerIconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>

          <View style={styles.headerIconButton} />
        </View>

        <View style={styles.profileTopRow}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followerCount !== null ? followerCount : (profileUser?.followerCount ?? 0)}</Text>
              <Text style={styles.statLabel}>followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followingCount !== null ? followingCount : (profileUser?.followingCount ?? 0)}</Text>
              <Text style={styles.statLabel}>following</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioWrap}>
          <Text style={styles.displayName}>{displayName}</Text>
          {bio ? <Text style={styles.bioText}>{bio}</Text> : null}
        </View>

        <View style={styles.actionsWrap}>
          <Pressable style={styles.actionProfileButton} onPress={handleToggleFollow}>
            <Text style={styles.actionProfileText}>
              {isFollowing ? "Đang theo dõi" : "Theo dõi"}
            </Text>
          </Pressable>

          <Pressable style={styles.actionProfileButton} onPress={handleOpenMessage}>
            <Text style={styles.actionProfileText}>Nhắn tin</Text>
          </Pressable>
        </View>

        <View style={styles.postsDivider}>
          <Ionicons name="grid-outline" size={20} color="#111" />
        </View>

        {loading && !refreshing ? <Text style={styles.stateText}>Đang tải trang cá nhân...</Text> : null}
        {error ? <Text style={styles.stateText}>{error}</Text> : null}

        {!loading && !error && feedPosts.length === 0 ? (
          <Text style={styles.stateText}>Người dùng chưa có bài viết nào.</Text>
        ) : null}

        {!loading && !error && feedPosts.length > 0 ? (
          <View style={styles.gridWrap}>
            {feedPosts.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handlePressGridPost(item)}
                style={styles.gridItem}
              >
                <Image
                  source={{ uri: item.images[0] }}
                  blurRadius={
                    item.isSensitive && !revealedSensitiveByPostId[item.id]
                      ? 20
                      : 0
                  }
                  style={styles.gridImage}
                />
                {item.isSensitive && !revealedSensitiveByPostId[item.id] ? (
                  <View style={styles.sensitiveGridOverlay}>
                    <Ionicons name="eye-off" size={18} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  headerRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    paddingHorizontal: 8,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statsRow: {
    flex: 1,
    marginLeft: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    minWidth: 70,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 13,
    color: "#4b5563",
  },
  bioWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  displayName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  bioText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#111",
  },
  actionsWrap: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionProfileButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  actionProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  postsDivider: {
    height: 42,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: "relative",
  },
  gridImage: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
  sensitiveGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
});
