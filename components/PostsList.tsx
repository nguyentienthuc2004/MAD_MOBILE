import { ReactElement, useRef, useState } from "react";
import { FlatList, StyleSheet, type ViewToken } from "react-native";
import PostCard, { Post } from "./PostCard";

type PostsListProps = {
  posts: Post[];
  listHeaderComponent?: ReactElement;
};

export default function PostsList({ posts, listHeaderComponent }: PostsListProps) {
  const [activePostId, setActivePostId] = useState<string | null>(posts[0]?.id ?? null);
  const [isFeedMuted, setIsFeedMuted] = useState(true);

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 70,
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<Post>> }) => {
      const firstVisiblePost = viewableItems.find((item) => item.isViewable)?.item;
      setActivePostId(firstVisiblePost?.id ?? null);
    }
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeaderComponent}
      contentContainerStyle={styles.postsContent}
      viewabilityConfig={viewabilityConfigRef.current}
      onViewableItemsChanged={onViewableItemsChanged.current}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          isActive={item.id === activePostId}
          isFeedMuted={isFeedMuted}
          onToggleFeedMuted={() => setIsFeedMuted((prev) => !prev)}
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
