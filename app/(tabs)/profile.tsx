import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

const ProfileScreen = () => {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Profile</Text>
      <Pressable
        onPress={() => router.replace("/login")}
        style={{
          marginTop: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: "#111",
        }}
      >
        <Text style={{ color: "#fff" }}>Logout</Text>
      </Pressable>
    </View>
  );
};

export default ProfileScreen;