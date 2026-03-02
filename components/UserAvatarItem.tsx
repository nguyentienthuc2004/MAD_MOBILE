import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export type UserAvatar = {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
};

type UserAvatarItemProps = {
  user: UserAvatar;
  showOnlineDot?: boolean;
  onPress?: (user: UserAvatar) => void;
};

export default function UserAvatarItem({
  user,
  showOnlineDot = true,
  onPress,
}: UserAvatarItemProps) {
  return (
    <Pressable style={styles.userItem} onPress={() => onPress?.(user)}>
      <View style={styles.avatarWrap}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        {showOnlineDot && user.isOnline !== false ? <View style={styles.onlineDot} /> : null}
      </View>
      <Text style={styles.userName} numberOfLines={1}>
        {user.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  userItem: {
    width: 76,
    marginRight: 12,
    alignItems: "center",
  },
  avatarWrap: {
    width: 64,
    height: 64,
    position: "relative",
    marginBottom: 6,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 12,
    color: "#333",
  },
});
