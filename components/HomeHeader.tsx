import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        <Image
          source={require("../assets/images/logo-app.jpg")}
          style={styles.logoImage}
        />
        <Text style={styles.logoText}>Social Media</Text>
      </View>

      <Pressable style={styles.iconButton}>
        <Ionicons name="paper-plane-outline" size={24} color="black" />
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
