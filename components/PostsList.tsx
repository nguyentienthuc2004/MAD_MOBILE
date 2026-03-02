import { ReactElement } from "react";
import { FlatList, StyleSheet } from "react-native";
import PostCard, { Post } from "./PostCard";

type PostsListProps = {
  posts: Post[];
  listHeaderComponent?: ReactElement;
};

export default function PostsList({ posts, listHeaderComponent }: PostsListProps) {
  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeaderComponent}
      contentContainerStyle={styles.postsContent}
      renderItem={({ item }) => <PostCard post={item} />}
    />
  );
}

const styles = StyleSheet.create({
  postsContent: {
    paddingBottom: 24,
  },
});
