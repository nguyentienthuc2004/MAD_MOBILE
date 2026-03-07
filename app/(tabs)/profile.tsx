import { useAuth } from "@/hooks/useAuth";
import { Pressable, Text, View } from "react-native";

const ProfileScreen = () => {
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const isSubmitting = useAuth((state) => state.isSubmitting);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Profile</Text>
      <Text style={{ marginTop: 8 }}>{user?.username ?? "-"}</Text>
      <Text style={{ marginTop: 4 }}>{user?.email ?? "-"}</Text>
      <Pressable
        onPress={handleLogout}
        disabled={isSubmitting}
        style={{
          marginTop: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: "#111",
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "#fff" }}>
          {isSubmitting ? "Logging out..." : "Logout"}
        </Text>
      </Pressable>
    </View>
  );
};

export default ProfileScreen;
