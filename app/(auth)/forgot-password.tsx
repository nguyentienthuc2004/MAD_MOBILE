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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");

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
          placeholder="Nhập email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Gửi yêu cầu</Text>
        </Pressable>

        <Link href="/login" style={styles.linkPrimary}>
          Quay lại đăng nhập
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
  linkPrimary: {
    textAlign: "center",
    color: "#2b7fd6",
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
