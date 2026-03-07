import { useAuth } from "@/hooks/useAuth";
import { router, Stack, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const segments = useSegments();
  const isHydrating = useAuth((state) => state.isHydrating);
  const hasHydratedOnce = useAuth((state) => state.hasHydratedOnce);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const hydrate = useAuth((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hasHydratedOnce || isHydrating) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [hasHydratedOnce, isAuthenticated, isHydrating, segments]);

  if (!hasHydratedOnce || isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack initialRouteName="(auth)" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(chats)" />
    </Stack>
  );
}
