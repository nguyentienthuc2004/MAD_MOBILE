import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { Pressable } from "react-native";

/**
 * Nut quay lai co fallback khi khong the back.
 * @param href Duong dan thay the neu khong the back
 * @returns JSX Element
 */
export default function BackButton({ href }: { href: Href }) {
  /**
   * Xu ly quay lai hoac thay the route an toan.
   * @returns void
   */
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(href);
  };

  return (
    <Pressable onPress={handleBack} hitSlop={10}>
      <Ionicons name="arrow-back" size={24} color="#000" />
    </Pressable>
  );
}
