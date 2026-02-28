import { Link, router } from "expo-router";
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
					onChangeText={setEmail}
					style={styles.input}
				/>

				<TextInput
					placeholder="Mật khẩu"
					secureTextEntry
					value={password}
					onChangeText={setPassword}
					style={styles.input}
				/>

				<Pressable
					style={styles.button}
					onPress={() => router.replace("/home")}
				>
					<Text style={styles.buttonText}>Đăng nhập</Text>
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
	link: {
		textAlign: "center",
	},
});
