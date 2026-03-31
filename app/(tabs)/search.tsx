import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { type ApiResponse } from "@/services/api";
import { followService } from "@/services/follow.service";
import { type Post as ApiPost, postService } from "@/services/post.service";
import {
  searchService,
  type SearchUser,
  type SearchPost,
} from "@/services/search.service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GRID_GAP = 2;
const GRID_ITEM_SIZE = (Dimensions.get("window").width - GRID_GAP * 2) / 3;
const FALLBACK_AVATAR = "https://placehold.co/100x100/e2e8f0/64748b?text=U";
const FALLBACK_POST_IMAGE = "https://placehold.co/400x400/e2e8f0/64748b?text=P";

const SearchScreen = () => {
  const router = useRouter();
  const currentUser = useAuth((s) => s.user);

  // Search state
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // User search results
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPostResults, setSearchPostResults] = useState<SearchPost[]>([]);

  // Explore grid posts
  const { request: fetchExplore, loading: exploreLoading } =
    useApi<ApiResponse<ApiPost[]>>();
  const [explorePosts, setExplorePosts] = useState<ApiPost[]>([]);

  // Persist revealed sensitive flags across remounts in this module
  // so returning from post-detail keeps the overlay state.
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  let revealedSensitiveCache: Record<string, boolean> = (global as any).__revealedSensitiveCache || {};
  (global as any).__revealedSensitiveCache = revealedSensitiveCache;
  const [revealedSensitiveByPostId, setRevealedSensitiveByPostId] =
    useState<Record<string, boolean>>(revealedSensitiveCache);
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
  const [refreshing, setRefreshing] = useState(false);

  // Follow toggling state
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(
    new Set()
  );

  // Load explore posts on mount
  useEffect(() => {
    const loadExplore = async () => {
      const res = await fetchExplore(() => postService.getPostsNotByMe());
      if (res?.data) {
        setExplorePosts(res.data);
      }
    };
    void loadExplore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = query.trim();
        const [usersRes, postsRes] = await Promise.allSettled([
          searchService.searchUsers(q),
          searchService.searchPosts(q),
        ]);

        if (usersRes.status === "fulfilled") {
          setSearchResults(usersRes.value.data ?? []);
        } else {
          setSearchResults([]);
        }

        if (postsRes.status === "fulfilled") {
          setSearchPostResults(postsRes.value.data ?? []);
        } else {
          setSearchPostResults([]);
        }
      } catch (err) {
        setSearchResults([]);
        setSearchPostResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleToggleFollow = useCallback(
    async (userId: string, currentlyFollowing: boolean) => {
      if (followLoadingIds.has(userId)) return;

      setFollowLoadingIds((prev) => new Set(prev).add(userId));
      try {
        if (currentlyFollowing) {
          await followService.unfollowUser(userId);
        } else {
          await followService.followUser(userId);
        }

        setSearchResults((prev) =>
          prev.map((u) =>
            u._id === userId ? { ...u, isFollowing: !currentlyFollowing } : u
          )
        );
      } catch {
        // ignore
      } finally {
        setFollowLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    [followLoadingIds]
  );

  const handleUserPress = (userId: string) => {
    router.push({ pathname: "/users/[userId]", params: { userId } });
  };

  // --- Render user search result item ---
  const renderUserItem = ({ item }: { item: SearchUser }) => {
    const isSelf = item._id === currentUser?._id;
    const isFollowing = !!item.isFollowing;
    const isToggling = followLoadingIds.has(item._id);

    return (
      <Pressable
        style={styles.userRow}
        onPress={() => handleUserPress(item._id)}
      >
        <Image
          source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={styles.userDisplayName} numberOfLines={1}>
            {item.displayName || item.fullName || ""}
          </Text>
        </View>

        {!isSelf && (
          <Pressable
            style={[
              styles.followBtn,
              isFollowing ? styles.followingBtn : styles.followNewBtn,
            ]}
            onPress={() => handleToggleFollow(item._id, isFollowing)}
            disabled={isToggling}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color={isFollowing ? "#111" : "#fff"} />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  isFollowing
                    ? styles.followingBtnText
                    : styles.followNewBtnText,
                ]}
              >
                {isFollowing ? "Đang theo dõi" : "Theo dõi"}
              </Text>
            )}
          </Pressable>
        )}
      </Pressable>
    );
  };

  // --- Render explore grid item ---
  const renderGridItem = ({
    item,
  }: {
    item: ApiPost | SearchPost;
  }) => {
    const imageUri = item.images?.[0] || FALLBACK_POST_IMAGE;
    const isBlocked = Boolean(item.isSensitive) && !revealedSensitiveByPostId[item._id];

    const handlePress = () => {
      if (!isBlocked) {
        router.push({ pathname: "/post-detail", params: { postId: item._id } });
        return;
      }

      // confirm reveal
      Alert.alert(
        "Nội dung nhạy cảm",
        "Bài viết này có thể chứa hình ảnh không phù hợp với một số người xem. Bạn có muốn tiếp tục không?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xem bài viết",
            onPress: () => {
              // persist to module/global cache so returning keeps the overlay state
              const g = global as any;
              g.__revealedSensitiveCache = { ...(g.__revealedSensitiveCache || {}), [item._id]: true };
              setRevealedSensitiveByPostId((prev) => ({ ...prev, [item._id]: true }));
              router.push({ pathname: "/post-detail", params: { postId: item._id } });
            },
          },
        ],
      );
    };

    return (
      <Pressable key={item._id} style={styles.gridItem} onPress={handlePress}>
        <Image
          source={{ uri: imageUri }}
          blurRadius={isBlocked ? 20 : 0}
          style={styles.gridImage}
        />
        {item.isSensitive && isBlocked ? (
          <View style={styles.sensitiveGridOverlay}>
            <Ionicons name="eye-off" size={18} color="#fff" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderSearchPostGridItem = ({ item }: { item: SearchPost }) => {
    const imageUri = item.images?.[0] || FALLBACK_POST_IMAGE;
    const isBlocked = Boolean(item.isSensitive) && !revealedSensitiveByPostId[item._id];

    const handlePress = () => {
      if (!isBlocked) {
        router.push({ pathname: "/post-detail", params: { postId: item._id } });
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
              const g = global as any;
              g.__revealedSensitiveCache = { ...(g.__revealedSensitiveCache || {}), [item._id]: true };
              setRevealedSensitiveByPostId((prev) => ({ ...prev, [item._id]: true }));
              router.push({ pathname: "/post-detail", params: { postId: item._id } });
            },
          },
        ],
      );
    };

    return (
      <Pressable key={item._id} style={styles.gridItem} onPress={handlePress}>
        <Image
          source={{ uri: imageUri }}
          blurRadius={isBlocked ? 20 : 0}
          style={styles.gridImage}
        />
        {item.isSensitive && isBlocked ? (
          <View style={styles.sensitiveGridOverlay}>
            <Ionicons name="eye-off" size={18} color="#fff" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      if (isSearching) {
        if (!query.trim()) {
          return;
        }
        try {
          const q = query.trim();
          const [usersRes, postsRes] = await Promise.allSettled([
            searchService.searchUsers(q),
            searchService.searchPosts(q),
          ]);

          if (usersRes.status === "fulfilled") {
            setSearchResults(usersRes.value.data ?? []);
          } else {
            setSearchResults([]);
          }

          if (postsRes.status === "fulfilled") {
            setSearchPostResults(postsRes.value.data ?? []);
          } else {
            setSearchPostResults([]);
          }
        } catch {
          // ignore
          setSearchResults([]);
          setSearchPostResults([]);
        }
      } else {
        const res = await fetchExplore(() => postService.getPostsNotByMe());
        if (res?.data) {
          setExplorePosts(res.data);
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      );
    }

    const noUsers = (searchResults?.length ?? 0) === 0;
    const noPosts = (searchPostResults?.length ?? 0) === 0;

    if (noUsers && noPosts) {
      return (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
        </View>
      );
    }

    if (!noUsers) {
      return (
        <FlatList
          key="search-users"
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.userListContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={() => (
            <View style={styles.postsGridWrap}>
              <Text style={styles.sectionTitle}>Bài viết</Text>
              <View style={styles.gridWrap}>
                {searchPostResults.map((p) => (
                  <View key={p._id} style={styles.gridItem}>
                    {renderSearchPostGridItem({ item: p })}
                  </View>
                ))}
              </View>
            </View>
          )}
        />
      );
    }

    // No users but have posts
    return (
      <FlatList
        key="search-posts"
        data={searchPostResults}
        renderItem={renderSearchPostGridItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Search bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={18}
            color="#9ca3af"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm"
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setIsSearching(text.trim().length > 0);
            }}
            onFocus={() => query.trim() && setIsSearching(true)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery("");
                setIsSearching(false);
                setSearchResults([]);
                setSearchPostResults([]);
              }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {isSearching ? (
        renderSearchResults()
      ) : (
        // Explore grid
        exploreLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <FlatList
            key="explore"
            data={explorePosts}
            renderItem={renderGridItem}
            keyExtractor={(item) => item._id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )
      )}
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchBarWrap: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },

  // User list
  userListContent: {
    paddingHorizontal: 14,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e5e7eb",
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  userDisplayName: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 1,
  },

  // Follow button
  followBtn: {
    minWidth: 100,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  followNewBtn: {
    backgroundColor: "#3b82f6",
  },
  followingBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  followNewBtnText: {
    color: "#fff",
  },
  followingBtnText: {
    color: "#111",
  },

  // Explore grid
  gridRow: {
    gap: GRID_GAP,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    marginBottom: GRID_GAP,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f3f4f6",
  },
  sensitiveGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty / center
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  postsGridWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
});
