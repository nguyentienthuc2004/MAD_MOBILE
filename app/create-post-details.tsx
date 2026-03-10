import BackButton from "@/components/BackButton";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_CAPTION = 500;

export default function CreatePostDetailsScreen() {
  const params = useLocalSearchParams<{ selectedCount?: string }>();
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);

  const selectedCountNumber = Number(params.selectedCount ?? 0);
  const selectedCount = Number.isFinite(selectedCountNumber)
    ? selectedCountNumber
    : 0;

  const isPublishDisabled = useMemo(() => {
    const hasCaption = caption.trim().length > 0;
    const hasHashtag = hashtags.trim().length > 0;
    return !hasCaption && !hasHashtag && !selectedMusic;
  }, [caption, hashtags, selectedMusic]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <BackButton href="/create-post-image" />
        <Text style={styles.headerTitle}>Thong tin bai viet</Text>
        <Pressable
          disabled={isPublishDisabled}
          style={[
            styles.publishButton,
            isPublishDisabled && styles.publishButtonDisabled,
          ]}
          onPress={() => {
            console.log("Create post details:", {
              caption,
              hashtags,
              selectedMusic,
              selectedCount,
            });
          }}
        >
          <Text
            style={[
              styles.publishButtonText,
              isPublishDisabled && styles.publishButtonTextDisabled,
            ]}
          >
            Dang
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.selectedInfoCard}>
          <Ionicons name="images-outline" size={20} color="#111" />
          <Text style={styles.selectedInfoText}>Da chon {selectedCount} anh</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Noi dung</Text>
          <TextInput
            value={caption}
            onChangeText={(text) => setCaption(text.slice(0, MAX_CAPTION))}
            placeholder="Ban dang nghi gi?"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            style={styles.captionInput}
          />
          <Text style={styles.helperText}>
            {caption.length}/{MAX_CAPTION}
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Hashtag</Text>
          <View style={styles.hashtagWrap}>
            <Feather name="hash" size={16} color="#6b7280" />
            <TextInput
              value={hashtags}
              onChangeText={setHashtags}
              placeholder="fashion, ootd"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              style={styles.hashtagInput}
            />
          </View>
          <Text style={styles.helperText}>
            Cach nhau boi dau phay, vi du: fashion, ootd
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Nhac</Text>
          <Pressable
            style={styles.musicPicker}
            onPress={() =>
              setSelectedMusic((prev) =>
                prev ? null : "Lofi Chill - Demo track"
              )
            }
          >
            <View style={styles.musicLeftWrap}>
              <Ionicons name="musical-notes-outline" size={18} color="#111" />
              <Text style={styles.musicText}>
                {selectedMusic ?? "Chon nhac nen"}
              </Text>
            </View>
            <Ionicons
              name={selectedMusic ? "close-circle" : "chevron-forward"}
              size={18}
              color="#6b7280"
            />
          </Pressable>
          <Text style={styles.helperText}>
            Tam thoi dung mau demo, se noi API o buoc tiep theo
          </Text>
        </View>
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
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  publishButton: {
    minWidth: 54,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  publishButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  publishButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  publishButtonTextDisabled: {
    color: "#9ca3af",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  selectedInfoCard: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  selectedInfoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  captionInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff",
  },
  hashtagWrap: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  hashtagInput: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    paddingVertical: 0,
  },
  musicPicker: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  musicLeftWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  musicText: {
    fontSize: 14,
    color: "#111",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
