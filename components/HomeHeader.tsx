import { useChatStore } from "@/stores/chat.store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeHeader() {
  const unread = useChatStore((s) => s.unreadCount);
  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        <Image
          source={require("../assets/images/logo-app.jpg")}
          style={styles.logoImage}
        />
        <Text style={styles.logoText}>Social Media</Text>
      </View>

      <Pressable
        style={styles.iconButton}
        onPress={() => router.push("/(tabs)/chat")}
      >
        <Ionicons name="paper-plane-outline" size={24} color="black" />
        {unread > 0 && (
          <View style={{
            position: "absolute",
            top: -2,
            right: -2,
            backgroundColor: "#ff3b30",
            borderRadius: 8,
            width: 10,
            height: 10,
            zIndex: 1,
          }} pointerEvents="none" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoImage: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
