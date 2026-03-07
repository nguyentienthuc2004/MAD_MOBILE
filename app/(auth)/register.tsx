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

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const register = useAuth((state) => state.register);
  const isSubmitting = useAuth((state) => state.isSubmitting);
  const error = useAuth((state) => state.error);
  const clearError = useAuth((state) => state.clearError);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const handleRegister = async () => {
    if (
      !username.trim() ||
      !email.trim() ||
      !phoneNumber.trim() ||
      !password ||
      !confirmPassword
    ) {
      setValidationError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (username.trim().length < 3) {
      setValidationError("Username phải có ít nhất 3 ký tự");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setValidationError("Email không hợp lệ");
      return;
    }

    if (phoneNumber.trim().length < 9) {
      setValidationError("Số điện thoại không hợp lệ");
      return;
    }

    if (password.length < 6) {
      setValidationError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Mật khẩu nhập lại không khớp");
      return;
    }

    if (validationError) {
      setValidationError(null);
    }
    if (error) {
      clearError();
    }

    await register({
      username: username.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      password,
      confirmPassword,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Đăng ký</Text>

        <TextInput
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={(value) => {
            if (validationError) {
              setValidationError(null);
            }
            if (error) {
              clearError();
            }
            setUsername(value);
          }}
          style={styles.input}
        />

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
          placeholder="Số điện thoại"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={(value) => {
            if (validationError) {
              setValidationError(null);
            }
            if (error) {
              clearError();
            }
            setPhoneNumber(value);
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

        <TextInput
          placeholder="Nhập lại mật khẩu"
          secureTextEntry
          value={confirmPassword}
          onChangeText={(value) => {
            if (validationError) {
              setValidationError(null);
            }
            if (error) {
              clearError();
            }
            setConfirmPassword(value);
          }}
          style={styles.input}
        />

        {validationError ? (
          <Text style={styles.errorText}>{validationError}</Text>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </Text>
        </Pressable>

        <Link href="/login" style={styles.link}>
          Đã có tài khoản? Đăng nhập
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
