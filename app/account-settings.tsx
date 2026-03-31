import { useAuth } from "@/stores/auth.store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountSettings() {
  const router = useRouter();
  const logout = useAuth((s) => s.logout);
  const logoutAll = useAuth((s) => s.logoutAll);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // ignore
    }
  };

  const handleLogoutAll = () => {
    Alert.alert(
      "Đăng xuất tất cả thiết bị",
      "Bạn có chắc chắn muốn đăng xuất trên tất cả thiết bị?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất tất cả",
          style: "destructive",
          onPress: async () => {
            try {
              await logoutAll();
            } catch (err) {
              // ignore
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.title}>Cài đặt tài khoản</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.section}>
        <Pressable
          style={styles.row}
          onPress={() => router.push("/edit-profile" as any)}
        >
          <Text style={styles.rowText}>Chỉnh sửa thông tin</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>

        <Pressable
          style={styles.row}
          onPress={() => router.push("/change-password" as any)}
        >
          <Text style={styles.rowText}>Đổi mật khẩu</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.logoutBtn]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>

        <Pressable
          style={[styles.logoutBtn, styles.logoutAllBtn]}
          onPress={handleLogoutAll}
        >
          <Text style={[styles.logoutText, { color: "#fff" }]}>
            Đăng xuất tất cả thiết bị
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111" },
  section: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
  },
  row: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  rowText: { fontSize: 16, color: "#111" },
  actions: { marginTop: 24, paddingHorizontal: 16 },
  logoutBtn: {
    height: 46,
    borderRadius: 10,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  logoutAllBtn: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  logoutText: { color: "#111", fontWeight: "700" },
});
