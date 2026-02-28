import { Pressable } from "react-native";
import { Href, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BackButton({ href }: { href: Href }) {
	const handleBack = () => {
		if (router.canGoBack()) {
			router.back();
			return;
		}

		router.replace(href);
	};

	return (
		<Pressable
			onPress={handleBack}
			hitSlop={10}
		>
			<Ionicons name="arrow-back" size={24} color="#000" />
		</Pressable>
	);
}

