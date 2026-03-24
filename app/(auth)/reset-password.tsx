import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { authService } from "../../services/auth.service";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const resetToken = String((params as any).resetToken ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword({ resetToken, newPassword });
      router.push({ pathname: "/login" });
    } catch (e: any) {
      setError(e?.message ?? "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <TextInput
          placeholder="Mật khẩu mới"
          secureTextEntry
          value={newPassword}
          onChangeText={(v) => {
            if (error) setError(null);
            setNewPassword(v);
          }}
          style={styles.input}
        />

        <TextInput
          placeholder="Xác nhận mật khẩu"
          secureTextEntry
          value={confirmPassword}
          onChangeText={(v) => {
            if (error) setError(null);
            setConfirmPassword(v);
          }}
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading ? styles.buttonDisabled : undefined]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  card: {
    gap: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#3797EF",
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#95C6F8",
  },
  errorText: {
    color: "#dc2626",
  },
});
