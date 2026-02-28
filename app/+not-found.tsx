import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
	return (
		<>
			<Stack.Screen options={{ title: "Không tìm thấy" }} />
			<View style={styles.container}>
				<Text style={styles.title}>Trang không tồn tại</Text>
				<Link href="/login" style={styles.link}>
					Quay về đăng nhập
				</Link>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 16,
		gap: 8,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
	},
	link: {
		fontSize: 16,
	},
});
