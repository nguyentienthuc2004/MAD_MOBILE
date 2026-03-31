import { useAuth } from "@/hooks/useAuth";
import {
    userService,
    type UpdateProfilePayload,
} from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FALLBACK_AVATAR = "https://placehold.co/100x100/e2e8f0/64748b?text=U";

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const refetchMe = useAuth((s) => s.refetchMe);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate fields from current user data
  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName ?? "");
    setDisplayName(user.displayName ?? "");
    setPhoneNumber(user.phoneNumber ?? "");
    setBio(user.bio ?? "");
    setAvatarUri(user.avatarUrl ?? "");
    if (user.birthday) {
      try {
        const d = new Date(user.birthday);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        setBirthday(`${dd}/${mm}/${yyyy}`);
      } catch {
        setBirthday("");
      }
    }
  }, [user]);

  const handlePickAvatar = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert(
        "Quyền truy cập",
        "Vui lòng cấp quyền truy cập thư viện ảnh.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const changes: string[] = [];

      // Upload avatar first if changed
      if (avatarUri && avatarUri !== user?.avatarUrl) {
        await userService.uploadAvatar(avatarUri);
        changes.push("Ảnh đại diện");
      }

      const payload: UpdateProfilePayload = {
        displayName: displayName.trim(),
        fullName: fullName.trim(),
        bio: bio.trim(),
        phoneNumber: phoneNumber.trim(),
      };

      // Track text field changes
      if (fullName.trim() !== (user?.fullName ?? "")) changes.push("Tên");
      if (displayName.trim() !== (user?.displayName ?? ""))
        changes.push("Tên hiển thị");
      if (phoneNumber.trim() !== (user?.phoneNumber ?? ""))
        changes.push("Số điện thoại");
      if (bio.trim() !== (user?.bio ?? "")) changes.push("Giới thiệu");

      // Parse birthday from dd/mm/yyyy to ISO
      if (birthday.trim()) {
        const parts = birthday.trim().split("/");
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          const isoDate = `${yyyy}-${mm}-${dd}`;
          payload.birthday = isoDate;
        }
      } else {
        payload.birthday = null;
      }

      // Check birthday change
      const oldBirthday = user?.birthday
        ? (() => {
            const d = new Date(user.birthday);
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
          })()
        : "";
      if (birthday.trim() !== oldBirthday) changes.push("Ngày sinh");

      await userService.updateProfile(payload);
      await refetchMe();

      const message =
        changes.length > 0
          ? `Đã cập nhật: ${changes.join(", ")}`
          : "Không có thay đổi nào";

      Alert.alert("Thành công", message, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err?.message || "Không thể cập nhật thông tin. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <View style={styles.headerBackBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <Image
            source={{ uri: avatarUri || FALLBACK_AVATAR }}
            style={styles.avatar}
          />
          <Text style={styles.usernameLabel}>{user?.username ?? ""}</Text>
          <Pressable onPress={handlePickAvatar}>
            <Text style={styles.changeAvatarText}>Thay đổi ảnh đại diện</Text>
          </Pressable>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>THÔNG TIN CHÍNH</Text>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>TÊN</Text>
            <TextInput
              style={styles.fieldInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nhập tên đầy đủ"
              placeholderTextColor="#9ca3af"
              maxLength={100}
            />
          </View>

          {/* Username (read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>TÊN NGƯỜI DÙNG</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputReadonly]}
              value={user?.username ?? ""}
              editable={false}
            />
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SỐ ĐIỆN THOẠI</Text>
            <TextInput
              style={styles.fieldInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="0123456789"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>GIỚI THIỆU</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 60 }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Viết gì đó về bạn..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={500}
            />
          </View>

          {/* Birthday */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>NGÀY SINH</Text>
            <TextInput
              style={styles.fieldInput}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="dd/mm/yyyy"
              placeholderTextColor="#9ca3af"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Save button */}
        <Pressable
          style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#f97316",
    backgroundColor: "#e5e7eb",
  },
  usernameLabel: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  changeAvatarText: {
    marginTop: 4,
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "600",
  },

  // Form
  formSection: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    letterSpacing: 0.3,
  },
  fieldInput: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    fontSize: 15,
    color: "#111",
    paddingVertical: 10,
  },
  fieldInputReadonly: {
    color: "#6b7280",
    backgroundColor: "transparent",
  },

  // Save button
  saveBtn: {
    marginTop: 28,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
