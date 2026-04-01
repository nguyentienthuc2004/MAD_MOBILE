import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = String((params as any).email ?? "");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(60);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const iv = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const value = digits.join("");

  const handleChange = (index: number, text: string) => {
    if (error) setError(null);
    const ch = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = ch;
    setDigits(next);
    if (ch && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
    if (!ch && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (value.length !== 6) {
      setError("OTP phải có 6 chữ số");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authService.verifyOtp({ email, otp: value });
      const token = res.data?.resetToken;
      if (token) {
        router.push({
          pathname: "/reset-password",
          params: { resetToken: token },
        } as any);
      } else {
        setError(res.message ?? "Không thể xác thực OTP");
      }
    } catch (e: any) {
      setError(e?.message ?? "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0) return;
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword({ email });
      setSeconds(60);
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
      <Stack.Screen options={{ title: "Xác nhận OTP" }} />
      <View style={styles.card}>
        <Text style={styles.title}>Xác thực mã OTP</Text>
        <Text style={styles.sentInfo}>{`Đã gửi mã OTP đến ${email}`}</Text>
        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(ref) => {
                inputsRef.current[i] = ref;
              }}
              keyboardType="number-pad"
              value={d}
              onChangeText={(t) => handleChange(i, t)}
              maxLength={1}
              style={styles.otpBox}
            />
          ))}
        </View>

        <Text style={styles.mutedText}>
          {seconds > 0 ? `Gửi lại trong ${seconds}s` : "Bạn có thể gửi lại"}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading ? styles.buttonDisabled : undefined]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Đang xác thực..." : "Xác thực OTP"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.buttonSecondary,
            seconds > 0 ? styles.buttonDisabled : undefined,
          ]}
          onPress={handleResend}
          disabled={loading || seconds > 0}
        >
          <Text style={styles.buttonSecondaryText}>Gửi lại OTP</Text>
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
    alignItems: "center",
  },
  otpRow: {
    flexDirection: "row",
    gap: 8,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
  },
  mutedText: {
    color: "#6b7280",
  },
  sentInfo: {
    color: "#374151",
    fontSize: 14,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#3797EF",
    marginTop: 8,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#95C6F8",
  },
  buttonSecondary: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    marginTop: 8,
    width: "100%",
  },
  buttonSecondaryText: {
    color: "#111827",
    fontWeight: "600",
  },
  errorText: {
    color: "#dc2626",
  },
});
