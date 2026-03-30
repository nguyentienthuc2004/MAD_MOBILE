import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FALLBACK_AVATAR = "https://placehold.co/100x100/e2e8f0/64748b?text=U";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isNewPasswordValid = newPassword.length >= 6;
  const isConfirmMatch = confirmPassword.length > 0 && confirmPassword === newPassword;
  const canSubmit =
    currentPassword.length > 0 && isNewPasswordValid && isConfirmMatch;

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n${message}`);
      onOk?.();
    } else {
      Alert.alert(title, message, [{ text: "OK", onPress: onOk }]);
    }
  };

  const handleSave = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await userService.changePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      });
      showAlert("Thành công", "Mật khẩu đã được thay đổi", () => router.back());
    } catch (err: any) {
      showAlert(
        "Lỗi",
        err?.message || "Không thể thay đổi mật khẩu. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/(auth)/forgot-password" as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={styles.headerBackBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <Image
            source={{ uri: user?.avatarUrl || FALLBACK_AVATAR }}
            style={styles.avatar}
          />
          <Text style={styles.usernameText}>{user?.username ?? ""}</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu hiện tại"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showCurrentPw}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowCurrentPw((v) => !v)}
              >
                <Ionicons
                  name={showCurrentPw ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#6b7280"
                />
              </Pressable>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu mới</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              {newPassword.length > 0 && (
                <View style={styles.checkIcon}>
                  <Ionicons
                    name={isNewPasswordValid ? "checkmark" : "close"}
                    size={20}
                    color={isNewPasswordValid ? "#22c55e" : "#ef4444"}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              {confirmPassword.length > 0 && (
                <View style={styles.checkIcon}>
                  <Ionicons
                    name={isConfirmMatch ? "checkmark" : "close"}
                    size={20}
                    color={isConfirmMatch ? "#22c55e" : "#ef4444"}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Save button */}
        <Pressable
          style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Lưu mật khẩu</Text>
          )}
        </Pressable>

        {/* Forgot password link */}
        <Pressable style={styles.forgotBtn} onPress={handleForgotPassword}>
          <Text style={styles.forgotBtnText}>Quên mật khẩu?</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#f97316",
    backgroundColor: "#e5e7eb",
  },
  usernameText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  // Form
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  checkIcon: {
    marginLeft: 8,
  },

  // Save button
  saveBtn: {
    marginTop: 28,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Forgot
  forgotBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  forgotBtnText: {
    color: "#3b82f6",
    fontSize: 15,
    fontWeight: "600",
  },
});
