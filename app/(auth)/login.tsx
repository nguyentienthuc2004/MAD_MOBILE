import { useAuth } from "@/hooks/useAuth";
import { Link } from "expo-router";
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const login = useAuth((state) => state.login);
  const isSubmitting = useAuth((state) => state.isSubmitting);
  const error = useAuth((state) => state.error);
  const clearError = useAuth((state) => state.clearError);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setValidationError("Vui lòng nhập email và mật khẩu");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setValidationError("Email không hợp lệ");
      return;
    }

    if (password.length < 6) {
      setValidationError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (validationError) {
      setValidationError(null);
    }
    if (error) {
      clearError();
    }

    await login({ email: email.trim(), password: password });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Đăng nhập</Text>
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(value) => {
            if (validationError) {
              setValidationError(null);
            }
            if (error) {
              clearError();
            }
            setEmail(value);
          }}
          style={styles.input}
        />

        <TextInput
          placeholder="Mật khẩu"
          secureTextEntry
          value={password}
          onChangeText={(value) => {
            if (validationError) {
              setValidationError(null);
            }
            if (error) {
              clearError();
            }
            setPassword(value);
          }}
          style={styles.input}
        />

        {validationError ? (
          <Text style={styles.errorText}>{validationError}</Text>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Text>
        </Pressable>

        <Link href="/forgot-password" style={styles.link}>
          Quên mật khẩu?
        </Link>
        <Link href="/register" style={styles.link}>
          Chưa có tài khoản? Đăng ký
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
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
    backgroundColor: "#111",
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: "#dc2626",
  },
  link: {
    textAlign: "center",
  },
});
