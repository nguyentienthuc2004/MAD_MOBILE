import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState("");

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Quên mật khẩu</Text>

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

			<Link href="/login" style={styles.link}>
				Quay lại đăng nhập
			</Link>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		padding: 16,
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
