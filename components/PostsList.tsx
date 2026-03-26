import { ReactElement, useRef, useState } from "react";
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
};

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
}: PostsListProps) {
  const [activePostId, setActivePostId] = useState<string | null>(
    posts[0]?.id ?? null,
  );
  const [isFeedMuted, setIsFeedMuted] = useState(true);

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 70,
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
      const firstVisiblePost = viewableItems.find(
        (item) => item.isViewable,
      )?.item;
      setActivePostId(firstVisiblePost?.id ?? null);
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
