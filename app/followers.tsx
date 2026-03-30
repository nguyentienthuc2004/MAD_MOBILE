import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { followService, type FollowUser } from "@/services/follow.service";
import { chatService } from "@/services/chat.service";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FALLBACK_AVATAR = "https://placehold.co/100x100/e2e8f0/64748b?text=U";

type TabType = "followers" | "following";

export default function FollowersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    userId?: string;
    username?: string;
    initialTab?: string;
    followerCount?: string;
    followingCount?: string;
  }>();

  const targetUserId = params.userId ?? "";
  const displayUsername = params.username ?? "";
  const initialFollowerCount = parseInt(params.followerCount ?? "0", 10);
  const initialFollowingCount = parseInt(params.followingCount ?? "0", 10);

  const me = useAuth((s) => s.user);

  const [activeTab, setActiveTab] = useState<TabType>(
    params.initialTab === "following" ? "following" : "followers"
  );

  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(
    new Set()
  );

  // Track which users the current user is following (for the followers tab)
  const [myFollowingSet, setMyFollowingSet] = useState<Set<string>>(new Set());

  const fetchFollowers = useCallback(async () => {
    if (!targetUserId) return;
    setLoadingFollowers(true);
    try {
      const res = await followService.getFollowers(targetUserId);
      setFollowers(res.data ?? []);
    } catch {
      setFollowers([]);
    } finally {
      setLoadingFollowers(false);
    }
  }, [targetUserId]);

  const fetchFollowing = useCallback(async () => {
    if (!targetUserId) return;
    setLoadingFollowing(true);
    try {
      const res = await followService.getFollowing(targetUserId);
      setFollowing(res.data ?? []);
    } catch {
      setFollowing([]);
    } finally {
      setLoadingFollowing(false);
    }
  }, [targetUserId]);

  // Fetch who the current user is following to show correct button states
  const fetchMyFollowing = useCallback(async () => {
    if (!me?._id) return;
    try {
      const res = await followService.getFollowing(me._id, 1, 1000);
      const ids = new Set((res.data ?? []).map((u) => u._id));
      setMyFollowingSet(ids);
    } catch {
      // ignore
    }
  }, [me?._id]);

  useEffect(() => {
    void fetchFollowers();
    void fetchFollowing();
    void fetchMyFollowing();
  }, [fetchFollowers, fetchFollowing, fetchMyFollowing]);

  const handleToggleFollow = useCallback(
    async (userId: string, currentlyFollowing: boolean) => {
      if (followLoadingIds.has(userId)) return;

      setFollowLoadingIds((prev) => new Set(prev).add(userId));
      try {
        if (currentlyFollowing) {
          await followService.unfollowUser(userId);
          // Remove from following list if viewing own profile
          setFollowing((prev) => prev.filter((u) => u._id !== userId));
        } else {
          await followService.followUser(userId);
        }

        setMyFollowingSet((prev) => {
          const next = new Set(prev);
          if (currentlyFollowing) {
            next.delete(userId);
          } else {
            next.add(userId);
          }
          return next;
        });

        // Refresh both lists to keep counts accurate
        void fetchFollowers();
        void fetchFollowing();
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
    [followLoadingIds, fetchFollowers, fetchFollowing]
  );

  const handleMessage = useCallback(
    async (userId: string) => {
      try {
        const res = await chatService.createRoom(userId);
        const room = res.data?.room;
        if (room?._id) {
          router.push({
            pathname: "/(chats)/[roomId]",
            params: { roomId: room._id },
          });
        }
      } catch {
        // ignore
      }
    },
    [router]
  );

  const handleUserPress = (userId: string) => {
    if (userId === me?._id) {
      router.push("/(tabs)/profile");
    } else {
      router.push({ pathname: "/users/[userId]", params: { userId } });
    }
  };

  const isViewingOwnProfile = targetUserId === me?._id;

  const renderFollowerItem = ({ item }: { item: FollowUser }) => {
    const isSelf = item._id === me?._id;
    const isFollowing = myFollowingSet.has(item._id);
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
              <ActivityIndicator
                size="small"
                color={isFollowing ? "#111" : "#fff"}
              />
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

  const renderFollowingItem = ({ item }: { item: FollowUser }) => {
    const isSelf = item._id === me?._id;
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

        {!isSelf && isViewingOwnProfile && (
          <View style={styles.followingActions}>
            <Pressable
              style={styles.messageBtn}
              onPress={() => handleMessage(item._id)}
            >
              <Text style={styles.messageBtnText}>Nhắn tin</Text>
            </Pressable>
            <Pressable
              style={styles.unfollowBtn}
              onPress={() => handleToggleFollow(item._id, true)}
              disabled={isToggling}
            >
              {isToggling ? (
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <Text style={styles.unfollowBtnText}>Bỏ theo dõi</Text>
              )}
            </Pressable>
          </View>
        )}

        {!isSelf && !isViewingOwnProfile && (
          <Pressable
            style={[
              styles.followBtn,
              myFollowingSet.has(item._id)
                ? styles.followingBtn
                : styles.followNewBtn,
            ]}
            onPress={() =>
              handleToggleFollow(item._id, myFollowingSet.has(item._id))
            }
            disabled={isToggling}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  myFollowingSet.has(item._id)
                    ? styles.followingBtnText
                    : styles.followNewBtnText,
                ]}
              >
                {myFollowingSet.has(item._id) ? "Đang theo dõi" : "Theo dõi"}
              </Text>
            )}
          </Pressable>
        )}
      </Pressable>
    );
  };

  const data = activeTab === "followers" ? followers : following;
  const isLoading =
    activeTab === "followers" ? loadingFollowers : loadingFollowing;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayUsername}
        </Text>
        <View style={styles.headerBackBtn} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "followers" && styles.activeTab]}
          onPress={() => setActiveTab("followers")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "followers" && styles.activeTabText,
            ]}
          >
            Người theo dõi{" "}
            <Text style={styles.tabCount}>{followers.length}</Text>
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "following" && styles.activeTab]}
          onPress={() => setActiveTab("following")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "following" && styles.activeTabText,
            ]}
          >
            Đang theo dõi{" "}
            <Text style={styles.tabCount}>{following.length}</Text>
          </Text>
        </Pressable>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyText}>
            {activeTab === "followers"
              ? "Chưa có người theo dõi"
              : "Chưa theo dõi ai"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={
            activeTab === "followers" ? renderFollowerItem : renderFollowingItem
          }
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  headerBackBtn: {
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

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#111",
  },
  tabText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#111",
    fontWeight: "700",
  },
  tabCount: {
    fontWeight: "700",
  },

  // List
  listContent: {
    paddingHorizontal: 14,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    marginTop: 2,
  },

  // Follow buttons
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

  // Following tab actions
  followingActions: {
    flexDirection: "row",
    gap: 8,
  },
  messageBtn: {
    height: 34,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  messageBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  unfollowBtn: {
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  unfollowBtnText: {
    color: "#111",
    fontSize: 13,
    fontWeight: "600",
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
});
