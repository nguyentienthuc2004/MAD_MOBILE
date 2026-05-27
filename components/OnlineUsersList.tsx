import { FlatList, StyleSheet } from "react-native";
import UserAvatarItem, { UserAvatar } from "./UserAvatarItem";

type OnlineUsersListProps = {
  users: UserAvatar[];
  onUserPress?: (user: UserAvatar) => void;
};

/**
 * Danh sach avatar nguoi dung online theo hang ngang.
 * @param users Danh sach user
 * @param onUserPress Callback khi bam vao user
 * @returns JSX Element
 */
export default function OnlineUsersList({ users, onUserPress }: OnlineUsersListProps) {
  return (
    <FlatList
      data={users}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.onlineListContent}
      renderItem={({ item }) => <UserAvatarItem user={item} onPress={onUserPress} />}
    />
  );
}

const styles = StyleSheet.create({
  onlineListContent: {
    paddingHorizontal: 12,
  },
});
