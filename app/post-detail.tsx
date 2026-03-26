import PostCard, { Post as FeedPost } from "@/components/PostCard";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, ApiResponse } from "@/services/api";
import { musicService } from "@/services/music.service";
import { Post as ApiPost, postService } from "@/services/post.service";
import { type AppUser, userService } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
	type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FALLBACK_POST_IMAGE = "https://placehold.co/1080x1080?text=Post";
const FALLBACK_AVATAR_URL = "https://placehold.co/200x200?text=User";
type FeedPostItem = FeedPost & { isOwnPost: boolean };

export default function PostDetailScreen() {
	const router = useRouter();
	const { postId, userId, displayName, avatarUrl } = useLocalSearchParams<{
		postId?: string;
		userId?: string;
		displayName?: string;
		avatarUrl?: string;
	}>();
	const selectedPostId = typeof postId === "string" ? postId : "";
	const targetUserId = typeof userId === "string" ? userId : "";
	const targetDisplayName = typeof displayName === "string" ? displayName : "";
	const targetAvatarUrl = typeof avatarUrl === "string" ? avatarUrl : "";

	const user = useAuth((state) => state.user);
	const { request, loading, error } = useApi<ApiResponse<ApiPost[]>>();
	const [posts, setPosts] = useState<ApiPost[]>([]);
	const [feedOwner, setFeedOwner] = useState<AppUser | null>(null);
	const [musicUrlsById, setMusicUrlsById] = useState<Record<string, string>>({});
	const [refreshing, setRefreshing] = useState(false);
	const [activePostId, setActivePostId] = useState<string | null>(
		selectedPostId || null,
	);
	const [isFeedMuted, setIsFeedMuted] = useState(true);

	const listRef = useRef<FlatList<FeedPostItem>>(null);
	const viewabilityConfigRef = useRef({
		itemVisiblePercentThreshold: 70,
	});

	const onViewableItemsChanged = useRef(
		({ viewableItems }: { viewableItems: ViewToken<FeedPostItem>[] }) => {
			const firstVisiblePost = viewableItems.find(
				(item) => item.isViewable,
			)?.item;
			setActivePostId(firstVisiblePost?.id ?? null);
		},
	);

	const fetchPosts = useCallback(async () => {
		const meId = user?._id;
		const ownerId = targetUserId || meId;

		if (!ownerId) {
			setPosts([]);
			setFeedOwner(null);
			setMusicUrlsById({});
			return;
		}

		const res = await request(() => postService.getPostsByUserId(ownerId));
		if (!res?.data) {
			return;
		}

		if (ownerId === meId) {
			setFeedOwner(null);
		} else if (targetDisplayName || targetAvatarUrl) {
			setFeedOwner({
				_id: ownerId,
				displayName: targetDisplayName,
				username: targetDisplayName,
				avatarUrl: targetAvatarUrl,
			} as AppUser);
		} else {
			try {
				const ownerRes = await userService.getUserById(ownerId);
				setFeedOwner(ownerRes?.data ?? null);
			} catch {
				setFeedOwner(null);
			}
		}

		const nextPosts = res.data.posts;
		setPosts(nextPosts);
		setAuthorProfile(res.data.author);

		const musicIds = Array.from(
			new Set(
				nextPosts
					.map((item) => item.musicId)
					.filter(
						(musicId): musicId is string =>
							typeof musicId === "string" && musicId.length > 0,
					),
			),
		);

		if (musicIds.length === 0) {
			setMusicUrlsById({});
			return;
		}

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

		setMusicUrlsById(
			Object.fromEntries(
				resolvedMusics.filter(([, musicUrl]) => Boolean(musicUrl)),
			),
		);
	}, [request, targetAvatarUrl, targetDisplayName, targetUserId, user?._id]);

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

	const feedPosts = useMemo<FeedPostItem[]>(() => {
		const meId = user?._id ?? null;
		const resolvedOwnerName =
			feedOwner?.displayName ||
			feedOwner?.username ||
			(targetUserId && targetUserId !== meId
				? "Người dùng"
				: user?.displayName || user?.username || "Bạn");
		const resolvedOwnerAvatar =
			feedOwner?.avatarUrl ||
			(targetUserId && targetUserId !== meId
				? FALLBACK_POST_IMAGE
				: user?.avatarUrl || FALLBACK_POST_IMAGE);

		return posts.map((item) => ({
			id: item._id,
			userName: resolvedOwnerName,
			userAvatar: resolvedOwnerAvatar,
			images: item.images?.length ? item.images : [FALLBACK_POST_IMAGE],
			caption: item.caption ?? "",
			hashtags: item.hashtags ?? [],
			likes: item.likeCount ?? 0,
			createdAt: item.createdAt,
			musicUrl: item.musicId ? musicUrlsById[item.musicId] : undefined,
			isSensitive: Boolean(item.isSensitive),
			isOwnPost: meId ? item.userId === meId : false,
		}));
	}, [feedOwner?.avatarUrl, feedOwner?.displayName, feedOwner?.username, musicUrlsById, posts, targetUserId, user?._id, user?.avatarUrl, user?.displayName, user?.username]);

	const postById = useMemo(
		() => new Map(posts.map((item) => [item._id, item])),
		[posts],
	);

	const selectedIndex = useMemo(() => {
		if (!feedPosts.length) {
			return 0;
		}

		const index = feedPosts.findIndex((item) => item.id === selectedPostId);
		return index >= 0 ? index : 0;
	}, [feedPosts, selectedPostId]);

	useEffect(() => {
		if (!feedPosts.length) {
			return;
		}

		setActivePostId(feedPosts[selectedIndex]?.id ?? feedPosts[0]?.id ?? null);

		const timer = setTimeout(() => {
			listRef.current?.scrollToIndex({
				index: selectedIndex,
				animated: false,
			});
		}, 120);

		return () => clearTimeout(timer);
	}, [feedPosts, selectedIndex]);

	const handleScrollToIndexFailed = useCallback(
		({ index }: { index: number }) => {
			const safeIndex = Math.max(0, Math.min(index, feedPosts.length - 1));

			setTimeout(() => {
				listRef.current?.scrollToIndex({
					index: safeIndex,
					animated: false,
				});
			}, 200);
		},
		[feedPosts.length],
	);

	const handleOpenComments = useCallback(
		(post: FeedPostItem) => {
			void router.push({
				pathname: "/posts/[postId]/comments",
				params: {
					postId: post.id,
					username: post.userName,
				},
			});
		},
		[router],
	);

	const handleEditPost = useCallback(
		(post: FeedPostItem) => {
			const sourcePost = postById.get(post.id);

			if (!sourcePost) {
				return;
			}

			void router.push({
				pathname: "/post-edit/image",
				params: {
					postId: sourcePost._id,
					caption: sourcePost.caption ?? "",
					hashtags: JSON.stringify(sourcePost.hashtags ?? []),
					selectedCount: String(sourcePost.images?.length ?? 0),
					selectedUris: JSON.stringify(sourcePost.images ?? []),
					selectedMusicId: sourcePost.musicId ?? "",
				},
			});
		},
		[postById, router],
	);

	const handleDeletePost = useCallback((post: FeedPostItem) => {
		Alert.alert("Xóa bài viết", "Bạn có chắc muốn xóa bài viết này không?", [
			{ text: "Hủy", style: "cancel" },
			{
				text: "Xóa",
				style: "destructive",
				onPress: () => {
					void (async () => {
						try {
							await postService.deletePost(post.id);
							setPosts((prev) => prev.filter((item) => item._id !== post.id));
						} catch (deleteError) {
							const message =
								deleteError instanceof ApiError
									? deleteError.message
									: "Không thể xóa bài viết.";
							Alert.alert("Lỗi", message);
						}
					})();
				},
			},
		]);
	}, []);

	const handleOpenUserProfile = useCallback(
		(post: FeedPostItem) => {
			const targetUserId = post.authorId;

			if (!targetUserId) {
				return;
			}

			if (targetUserId === user?._id) {
				void router.push("/(tabs)/profile");
				return;
			}

			void router.push({
				pathname: "/users/[userId]",
				params: { userId: targetUserId },
			});
		},
		[router, user?._id],
	);

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			<View style={styles.header}>
				<Pressable style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={22} color="#111" />
				</Pressable>

				<Text style={styles.title}>Bài viết</Text>

				<View style={styles.headerSpacer} />
			</View>

			{loading && !refreshing ? <Text style={styles.stateText}>Đang tải bài viết...</Text> : null}
			{error ? <Text style={styles.stateText}>{error}</Text> : null}

			{!loading && !error && feedPosts.length === 0 ? (
				<Text style={styles.stateText}>Chưa có bài viết nào.</Text>
			) : null}

			{!loading && !error && feedPosts.length > 0 ? (
				<FlatList
					ref={listRef}
					data={feedPosts}
					keyExtractor={(item) => item.id}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContent}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
					}
					viewabilityConfig={viewabilityConfigRef.current}
					onViewableItemsChanged={onViewableItemsChanged.current}
					onScrollToIndexFailed={handleScrollToIndexFailed}
					renderItem={({ item }) => (
						<PostCard
							post={item}
							isActive={item.id === activePostId}
							isFeedMuted={isFeedMuted}
							isOwnPost={item.isOwnPost}
							onPressUser={() => handleOpenUserProfile(item)}
							onToggleFeedMuted={() => setIsFeedMuted((prev) => !prev)}
							onPressComment={() => handleOpenComments(item)}
							onPressEditPost={
								item.isOwnPost ? () => handleEditPost(item) : undefined
							}
							onPressDeletePost={
								item.isOwnPost ? () => handleDeletePost(item) : undefined
							}
						/>
					)}
				/>
			) : null}
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
		paddingHorizontal: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#e5e7eb",
	},
	backButton: {
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: "#111",
	},
	headerSpacer: {
		width: 36,
		height: 36,
	},
	listContent: {
		paddingVertical: 8,
		paddingBottom: 24,
	},
	stateText: {
		paddingHorizontal: 16,
		paddingTop: 14,
		fontSize: 14,
		color: "#6b7280",
	},
});
