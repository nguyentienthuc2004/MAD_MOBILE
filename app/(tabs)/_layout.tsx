import NotificationBadge from "@/components/notifications/NotificationBadge";
import { useAuth } from "@/stores/auth.store";
import { useNotifications } from "@/stores/notification.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
const TabsLayout = () => {
  const user = useAuth((state) => state.user);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "black",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "home-variant" : "home-variant-outline"}
              size={focused ? size + 3 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={focused ? size + 3 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notification"
        options={{
          title: "Notification",
          tabBarIcon: ({ color, size, focused }) => {
            const unread = useNotifications((s) => s.unreadCount);
            return (
              <View style={styles.iconWrap}>
                <Ionicons
                  name={focused ? "heart" : "heart-outline"}
                  size={focused ? size + 3 : size}
                  color={color}
                />
                <View style={styles.badgeWrap} pointerEvents="none">
                  <NotificationBadge count={unread} size={14} />
                </View>
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          // Ẩn tab Chat khỏi thanh tab, nhưng vẫn điều hướng được bằng router
          href: null,
          title: "Chat",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={{ uri: user?.avatarUrl }}
              style={{
                width: size + 4,
                height: size + 4,
                borderRadius: 999,
                borderWidth: focused ? 1.5 : 0,
                borderColor: "#111",
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;

const styles = StyleSheet.create({
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeWrap: {
    position: "absolute",
    top: -4,
    right: -8,
  },
});
