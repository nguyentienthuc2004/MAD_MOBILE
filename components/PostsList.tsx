import { ReactElement, useEffect, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  type ViewToken,
} from "react-native";
import PostCard, { Post } from "./PostCard";

type PostsListProps = {
  posts: Post[];
  listHeaderComponent?: ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  sensitiveResetKey?: number;
  canFollow?: boolean;
  getIsFollowing?: (post: Post) => boolean;
  onToggleFollow?: (post: Post, nextValue: boolean) => void;
  onPressUser?: (post: Post) => void;
  onPressPost?: (post: Post) => void;
  onPressMessage?: (post: Post) => void;
  onPressComment?: (post: Post) => void;
  onPostVisible?: (post: Post) => void | Promise<void>;
};

/**
 * Danh sach bai viet dang feed (FlatList).
 * @param posts Danh sach post
 * @param listHeaderComponent Header component tuy chon
 * @param refreshing Trang thai refresh
 * @param onRefresh Callback refresh
 * @param sensitiveResetKey Khoa reset che do noi dung nhay cam
 * @param canFollow Cho phep follow
 * @param getIsFollowing Ham kiem tra follow
 * @param onToggleFollow Callback theo doi
 * @param onPressUser Callback mo trang user
 * @param onPressPost Callback mo chi tiet post
 * @param onPressMessage Callback nhan tin
 * @param onPressComment Callback mo binh luan
 * @param onPostVisible Callback khi post duoc nhin thay
 * @returns JSX Element
 */
export default function PostsList({
  posts,
  listHeaderComponent,
  refreshing = false,
  onRefresh,
  sensitiveResetKey = 0,
  canFollow,
  getIsFollowing,
  onToggleFollow,
  onPressUser,
  onPressPost,
  onPressMessage,
  onPressComment: onPressCommentProp,
  onPostVisible,
}: PostsListProps) {
  const [activePostId, setActivePostId] = useState<string | null>(
    posts[0]?.id ?? null,
  );
  const [isFeedMuted, setIsFeedMuted] = useState(true);
  const onPostVisibleRef = useRef(onPostVisible);
  const lastVisiblePostIdRef = useRef<string | null>(null);

  useEffect(() => {
    onPostVisibleRef.current = onPostVisible;
  }, [onPostVisible]);

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 70,
  });

  /**
   * Xu ly khi post duoc view de cap nhat active va thong bao view.
   */
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
      const firstVisiblePost = viewableItems.find(
        (item) => item.isViewable,
      )?.item;
      setActivePostId(firstVisiblePost?.id ?? null);

      if (!firstVisiblePost?.id) {
        return;
      }

      if (lastVisiblePostIdRef.current === firstVisiblePost.id) {
        return;
      }

      lastVisiblePostIdRef.current = firstVisiblePost.id;
      void onPostVisibleRef.current?.(firstVisiblePost);
    },
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item, index) =>
        item.id ?? (item as any)._id ?? String(index)
      }
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeaderComponent}
      contentContainerStyle={styles.postsContent}
      viewabilityConfig={viewabilityConfigRef.current}
      onViewableItemsChanged={onViewableItemsChanged.current}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      renderItem={({ item }) => (
        <PostCard
          post={item}
          sensitiveResetKey={sensitiveResetKey}
          isActive={item.id === activePostId}
          isFeedMuted={isFeedMuted}
          canFollow={canFollow}
          isFollowing={getIsFollowing ? getIsFollowing(item) : undefined}
          onToggleFollow={
            onToggleFollow
              ? (nextValue) => onToggleFollow(item, nextValue)
              : undefined
          }
          onPressUser={onPressUser ? () => onPressUser(item) : undefined}
          onPressPost={onPressPost ? () => onPressPost(item) : undefined}
          onToggleFeedMuted={() => setIsFeedMuted((prev) => !prev)}
          onPressMessage={
            onPressMessage ? () => onPressMessage(item) : undefined
          }
          onPressComment={
            onPressCommentProp ? () => onPressCommentProp(item) : undefined
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  postsContent: {
    paddingBottom: 24,
  },
});
