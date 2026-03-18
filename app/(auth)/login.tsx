import { useAuth } from "@/hooks/useAuth";
import { Link } from "expo-router";
import { useState } from "react";
import {
    Image,
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
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo-app.jpg")}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>

      <View style={styles.card}>
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
          style={[
            styles.button,
            isSubmitting ? styles.buttonDisabled : undefined,
          ]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Text>
        </Pressable>

        <Link href="/forgot-password" style={styles.linkPrimary}>
          Quên mật khẩu?
        </Link>

        <View style={styles.rowLink}>
          <Text style={styles.mutedText}>Chưa có tài khoản? </Text>
          <Link href="/register" style={styles.linkPrimaryInline}>
            Đăng ký
          </Link>
        </View>
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
  link: {
    textAlign: "center",
  },
  linkPrimary: {
    textAlign: "center",
    color: "#2b7fd6",
    marginTop: 8,
  },
  linkPrimaryInline: {
    color: "#2b7fd6",
  },
  mutedText: {
    color: "#9ca3af",
  },
  rowLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
});
