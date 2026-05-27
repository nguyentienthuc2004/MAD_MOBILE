import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { authService } from "../../services/auth.service";

/**
 * Man hinh gui OTP quen mat khau.
 * @returns JSX Element
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Kiem tra dinh dang email.
   * @param value Email
   * @returns boolean
   */
  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  /**
   * Gui OTP ve email.
   * @returns Promise<void>
   * @sideEffect Goi API forgot password va dieu huong.
   */
  const handleSend = async () => {
    const value = email.trim();
    if (!value || !isValidEmail(value)) {
      setError("Email không hợp lệ");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword({ email: value });
      router.push({ pathname: "/verify-otp", params: { email: value } } as any);
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
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(v) => {
            if (error) setError(null);
            setEmail(v);
          }}
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading ? styles.buttonDisabled : undefined]}
          onPress={handleSend}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Đang gửi..." : "Gửi OTP"}
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
