import { Post as FeedPost } from "@/components/PostCard";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { ApiResponse } from "@/services/api";
import { Post as ApiPost, postService } from "@/services/post.service";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  const { request, loading, error } = useApi<ApiResponse<ApiPost[]>>();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const logout = useAuth((state) => state.logout);

  const fetchPosts = useCallback(async () => {
    const userId = user?._id;

    if (!userId) {
      setPosts([]);
      return;
    }

    console.log("Fetching posts for userId:", userId);
    const res = await request(() => postService.getPostsByUserId(userId));
    if (!res?.data) return;
    setPosts(res.data);
  }, [request, user?._id]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchPosts();
    } finally {
      setRefreshing(false);
    }
  }, [fetchPosts]);

  const feedPosts = useMemo<FeedPost[]>(() => {
    const displayName = user?.displayName || user?.username || "Bạn";
    const avatarUrl = user?.avatarUrl || FALLBACK_POST_IMAGE;

    return posts.map((post) => ({
      id: post._id,
      userName: displayName,
      userAvatar: avatarUrl,
      images: post.images?.length ? post.images : [FALLBACK_POST_IMAGE],
      caption: post.caption ?? "",
      likes: post.likeCount ?? 0,
    }));
  }, [posts, user?.avatarUrl, user?.displayName, user?.username]);

  const handleOpenPost = (postId: string) => {
    void router.push({
      pathname: "/post-detail",
      params: { postId },
    });
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

          <Pressable style={styles.headerIconButton} onPress={logout}>
            <Ionicons name="menu-outline" size={24} color="#111" />
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
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12.4k</Text>
              <Text style={styles.statLabel}>followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>248</Text>
              <Text style={styles.statLabel}>following</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioWrap}>
          <Text style={styles.displayName}>{user?.displayName}</Text>
          <Text style={styles.bioText}>
            {user?.bio}
          </Text>
        </View>

        <View style={styles.postsDivider}>
          <Ionicons name="grid-outline" size={20} color="#111" />
        </View>

        {loading && !refreshing ? <Text style={styles.stateText}>Đang tải bài viết...</Text> : null}
        {error ? <Text style={styles.stateText}>{error}</Text> : null}

        {!loading && !error && feedPosts.length === 0 ? (
          <Text style={styles.stateText}>Chưa có bài viết nào.</Text>
        ) : null}

        {!loading && !error && feedPosts.length > 0 ? (
          <View style={styles.gridWrap}>
            {feedPosts.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleOpenPost(item.id)}
                style={styles.gridItem}
              >
                <Image
                  source={{ uri: item.images[0] }}
                  style={styles.gridImage}
                />
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
  bioMeta: {
    marginTop: 2,
    fontSize: 13,
    color: "#6b7280",
  },
  bioLink: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
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
  },
  gridImage: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
  stateText: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
});

export default ProfileScreen;
