import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="login"
        options={{
          title: "Đăng nhập",
          gestureEnabled: false,
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Đăng ký",
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Quên mật khẩu",
        }}
      />
    </Stack>
  );
}
