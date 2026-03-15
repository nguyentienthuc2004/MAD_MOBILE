import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { chatService } from "@/services/chat.service";
import { musicService } from "@/services/music.service";
import { type Post as ApiPost, postService } from "@/services/post.service";
import { type AppUser, userService } from "@/services/user.service";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HomeHeader from "../../components/HomeHeader";
import OnlineUsersList from "../../components/OnlineUsersList";
import { type Post } from "../../components/PostCard";
import PostsList from "../../components/PostsList";
import { type UserAvatar } from "../../components/UserAvatarItem";

const FALLBACK_POST_IMAGE = "https://placehold.co/1080x1080?text=Post";
const FALLBACK_AVATAR_URL = "https://placehold.co/200x200?text=User";

const onlineUsers: UserAvatar[] = [
  {
    id: "1",
    name: "Linh",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    isOnline: true,
  },
  {
    id: "2",
    name: "Minh",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    isOnline: true,
  },
  {
    id: "3",
    name: "An",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    isOnline: true,
  },
  {
    id: "4",
    name: "Huy",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    isOnline: true,
  },
  {
    id: "5",
    name: "Trang",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    isOnline: true,
  },
  {
    id: "6",
    name: "Nam",
    avatar:
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=200",
    isOnline: true,
  },
];

export default function Home() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const { request, loading, error } = useApi<{
    posts: ApiPost[];
    users: AppUser[];
    musicUrlsById: Record<string, string>;
  }>();

  const [apiPosts, setApiPosts] = useState<ApiPost[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [musicUrlsById, setMusicUrlsById] = useState<Record<string, string>>(
    {},
  );
  const [refreshing, setRefreshing] = useState(false);
  const [followingByUserId, setFollowingByUserId] = useState<
    Record<string, boolean>
  >({});

  const fetchFeed = useCallback(async () => {
    if (!isAuthenticated) {
      setApiPosts([]);
      setUsers([]);
      setMusicUrlsById({});
      return;
    }

    const res = await request(async () => {
      const [postsRes, usersRes] = await Promise.all([
        postService.getPostsNotMe(),
        userService.getUsers(),
      ]);

      const posts = postsRes.data ?? [];
      const musicIds = Array.from(
        new Set(
          posts
            .map((item) => item.musicId)
            .filter(
              (musicId): musicId is string =>
                typeof musicId === "string" && musicId.length > 0,
            ),
        ),
      );

      let resolvedMusicUrlsById: Record<string, string> = {};

      if (musicIds.length > 0) {
        const resolvedMusics = await Promise.all(
          musicIds.map(async (musicId) => {
            try {
              const musicRes = await musicService.getMusicById(musicId);
              const musicUrl = musicRes?.data?.url;

              return [
                musicId,
                typeof musicUrl === "string" && musicUrl.length > 0
                  ? musicUrl
                  : "",
              ] as const;
            } catch {
              return [musicId, ""] as const;
            }
          }),
        );

        resolvedMusicUrlsById = Object.fromEntries(
          resolvedMusics.filter(([, musicUrl]) => Boolean(musicUrl)),
        );
      }

      return {
        posts,
        users: usersRes.data ?? [],
        musicUrlsById: resolvedMusicUrlsById,
      };
    });

    if (!res) {
      return;
    }

    setApiPosts(res.posts);
    setUsers(res.users);
    setMusicUrlsById(res.musicUrlsById);
  }, [isAuthenticated, request]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchFeed();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFeed]);

  const feedPosts = useMemo<Post[]>(() => {
    const usersById = new Map(users.map((item) => [item._id, item]));

    return apiPosts.map((item) => {
      const author = usersById.get(item.userId);

      return {
        id: item._id,
        authorId: item.userId,
        userName: author?.displayName || author?.username || "Người dùng",
        userAvatar: author?.avatarUrl || FALLBACK_AVATAR_URL,
        images: item.images?.length ? item.images : [FALLBACK_POST_IMAGE],
        caption: item.caption ?? "",
        likes: item.likeCount ?? 0,
        createdAt: item.createdAt,
        musicUrl: item.musicId ? musicUrlsById[item.musicId] : undefined,
      };
    });
  }, [apiPosts, musicUrlsById, users]);

  const handleOpenChatFromPost = async (post: Post) => {
    const receiverId = post.authorId;

    if (!receiverId) {
      Alert.alert("Lỗi", "Không xác định được người nhận.");
      return;
    }

    try {
      const res = await chatService.createRoom(receiverId);
      const room = res.data?.room;

      if (!room) {
        throw new Error("Không nhận được phòng chat");
      }

      router.push({
        pathname: "/(chats)/[roomId]",
        params: { roomId: room._id },
      });
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không mở được phòng chat");
    }
  };

  const handleOpenComments = (post: Post) => {
    void router.push({
      pathname: "/posts/[postId]/comments",
      params: { postId: post.id, username: post.userName },
    });
  };

  const handleOpenUserProfile = (post: Post) => {
    const authorId = post.authorId;

    if (!authorId) {
      return;
    }

    if (authorId === user?._id) {
      void router.push("/(tabs)/profile");
      return;
    }

    void router.push({
      pathname: "/users/[userId]",
      params: { userId: authorId },
    });
  };

  const handleToggleFollow = (post: Post, nextValue: boolean) => {
    if (!isAuthenticated || !user?._id) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để theo dõi.");
      return;
    }

    const authorId = post.authorId;

    if (!authorId) {
      return;
    }

    setFollowingByUserId((prev) => ({
      ...prev,
      [authorId]: nextValue,
    }));
  };

  const getIsFollowing = (post: Post) => {
    const authorId = post.authorId;

    if (!authorId) {
      return false;
    }

    return Boolean(followingByUserId[authorId]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HomeHeader />
      <View style={styles.content}>
        {loading && !refreshing ? (
          <Text style={styles.stateText}>Đang tải bảng tin...</Text>
        ) : null}
        {error ? <Text style={styles.stateText}>{error}</Text> : null}

        <PostsList
          posts={feedPosts}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          canFollow={Boolean(isAuthenticated && user?._id)}
          getIsFollowing={getIsFollowing}
          onToggleFollow={handleToggleFollow}
          onPressUser={handleOpenUserProfile}
          onPressMessage={handleOpenChatFromPost}
          onPressComment={handleOpenComments}
          listHeaderComponent={
            <View style={styles.onlineSection}>
              <OnlineUsersList
                users={onlineUsers}
                onUserPress={(user) => console.log("Open user:", user.name)}
              />
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  onlineSection: {
    paddingTop: 12,
    paddingBottom: 14,
  },
  stateText: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
});
