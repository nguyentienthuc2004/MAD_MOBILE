import { Post as FeedPost } from "@/components/PostCard";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { ApiResponse } from "@/services/api";
import likedPostService from "@/services/liked-post.service";
import { Post as ApiPost, postService } from "@/services/post.service";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

const ProfileScreen = () => {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const refetchMe = useAuth((state) => state.refetchMe);
  const { request, loading, error } = useApi<ApiResponse<ApiPost[]>>();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<ApiPost[]>([]);
  const [tab, setTab] = useState<"my" | "liked">("my");
  const [refreshing, setRefreshing] = useState(false);
  const [revealedSensitiveByPostId, setRevealedSensitiveByPostId] = useState<
    Record<string, boolean>
  >({});
  const logout = useAuth((state) => state.logout);

  const fetchPosts = useCallback(async () => {
    const userId = user?._id;
    if (!userId) {
      setPosts([]);
      return;
    }
    const res = await request(() => postService.getPostsByUserId(userId));
    if (!res?.data) return;
    setPosts(res.data);
    setRevealedSensitiveByPostId({});
  }, [request, user?._id]);

  const fetchLikedPosts = useCallback(async () => {
    const userId = user?._id;
    if (!userId) {
      setLikedPosts([]);
      return;
    }
    const res = await likedPostService.getLikedPostsByUser(userId);
    if (!res?.data) return;
    setLikedPosts(res.data);
    setRevealedSensitiveByPostId({});
  }, [user?._id]);

  useEffect(() => {
    if (tab === "my") void fetchPosts();
    else void fetchLikedPosts();
  }, [tab, fetchPosts, fetchLikedPosts]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await refetchMe();
      if (tab === "my") await fetchPosts();
      else await fetchLikedPosts();
    } finally {
      setRefreshing(false);
    }
  }, [tab, fetchPosts, fetchLikedPosts, refetchMe]);

  const feedPosts = useMemo<FeedPost[]>(() => {
    const displayName = user?.displayName || user?.username || "Bạn";
    const avatarUrl = user?.avatarUrl || FALLBACK_POST_IMAGE;
    const source = tab === "my" ? posts : likedPosts;
    return source.map((post) => ({
      id: post._id,
      userName: displayName,
      userAvatar: avatarUrl,
      images: post.images?.length ? post.images : [FALLBACK_POST_IMAGE],
      caption: post.caption ?? "",
      likes: post.likeCount ?? 0,
      commentCount: post.commentCount ?? 0,
      isSensitive: Boolean(post.isSensitive),
    }));
  }, [
    tab,
    posts,
    likedPosts,
    user?.avatarUrl,
    user?.displayName,
    user?.username,
  ]);

  // Mở post, truyền đúng authorId nếu là tab liked
  const handleOpenPost = (postId: string, authorId?: string) => {
    void router.push({
      pathname: "/post-detail",
      params: {
        postId,
        authorId: authorId || user?._id || "",
      },
    });
  };

  const handlePressGridPost = (item: FeedPost) => {
    const isBlocked =
      Boolean(item.isSensitive) && !revealedSensitiveByPostId[item.id];
    // Nếu là tab liked thì lấy authorId từ likedPosts, còn tab my thì lấy user._id
    let authorId = user?._id;
    if (tab === "liked") {
      const liked = likedPosts.find((p) => p._id === item.id);
      authorId = liked?.userId || "";
    }
    if (!isBlocked) {
      handleOpenPost(item.id, authorId);
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
            handleOpenPost(item.id, authorId);
          },
        },
      ],
    );
  };

  const handleOpenFollowers = () => {
    router.push({
      pathname: "/followers",
      params: {
        userId: user?._id ?? "",
        username: user?.username ?? "",
        initialTab: "followers",
        followerCount: String(user?.followerCount ?? 0),
        followingCount: String(user?.followingCount ?? 0),
      },
    } as any);
  };

  const handleOpenFollowing = () => {
    router.push({
      pathname: "/followers",
      params: {
        userId: user?._id ?? "",
        username: user?.username ?? "",
        initialTab: "following",
        followerCount: String(user?.followerCount ?? 0),
        followingCount: String(user?.followingCount ?? 0),
      },
    } as any);
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
          <Pressable
            style={styles.headerIconButton}
            onPress={() => router.push("/create-post-image")}
          >
            <Feather name="plus-square" size={22} color="#111" />
          </Pressable>

          <Pressable
            style={styles.headerIconButton}
            onPress={() => router.push("/account-settings")}
          >
            <Feather name="menu" size={22} color="#111" />
          </Pressable>
        </View>

        <View style={styles.profileTopRow}>
          <Image
            source={{
              uri: user?.avatarUrl,
            }}
            style={styles.avatar}
          />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <Pressable style={styles.statItem} onPress={handleOpenFollowers}>
              <Text style={styles.statValue}>{user?.followerCount ?? 0}</Text>
              <Text style={styles.statLabel}>followers</Text>
            </Pressable>
            <Pressable style={styles.statItem} onPress={handleOpenFollowing}>
              <Text style={styles.statValue}>{user?.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>following</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bioWrap}>
          <Text style={styles.displayName}>{user?.username}</Text>
          <Text style={styles.bioText}>{user?.bio}</Text>
        </View>

        {/* Action buttons moved to Account Settings */}

        {/* Tab buttons dưới action buttons */}
        <View style={styles.postsDivider}>
          <View style={{ flexDirection: "row", width: "100%" }}>
            <Pressable
              style={[styles.tabBtn, tab === "my" && styles.tabBtnActive]}
              onPress={() => setTab("my")}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={tab === "my" ? "#111" : "#aaa"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "my" && styles.tabBtnTextActive,
                ]}
              >
                Bài viết
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, tab === "liked" && styles.tabBtnActive]}
              onPress={() => setTab("liked")}
            >
              <Ionicons
                name="heart-outline"
                size={20}
                color={tab === "liked" ? "#e11d48" : "#aaa"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "liked" && styles.tabBtnTextActive,
                ]}
              >
                Đã thích
              </Text>
            </Pressable>
          </View>
        </View>

        {loading && !refreshing ? (
          <Text style={styles.stateText}>Đang tải bài viết...</Text>
        ) : null}
        {error ? <Text style={styles.stateText}>{error}</Text> : null}

        {!loading && !error && feedPosts.length === 0 ? (
          <Text style={styles.stateText}>Chưa có bài viết nào.</Text>
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
};

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
    paddingHorizontal: 16,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  // Đưa các style này vào đúng chỗ bên dưới
  avatar: {
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderColor: "transparent",
    },
    tabBtnActive: {
      borderColor: "#111",
    },
    tabBtnText: {
      marginLeft: 6,
      fontSize: 14,
      color: "#aaa",
      fontWeight: "600",
    },
    tabBtnTextActive: {
      color: "#111",
    },
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
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  editProfileBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  editProfileBtnText: {
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
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  tabBtnActive: {
    borderColor: "#111",
  },
  tabBtnText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#aaa",
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#111",
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

export default ProfileScreen;