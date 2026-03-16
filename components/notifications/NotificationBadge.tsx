import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  count: number;
  size?: number;
};

const NotificationBadge: React.FC<Props> = ({ count, size = 18 }) => {
  if (!count || count <= 0) return null;
  return (
    <View
      style={[
        styles.container,
        { minWidth: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.text}>{count > 99 ? "99+" : String(count)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});

export default NotificationBadge;
