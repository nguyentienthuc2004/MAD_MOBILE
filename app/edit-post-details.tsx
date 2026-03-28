import BackButton from "@/components/BackButton";
import { useApi } from "@/hooks/useApi";
import { type ApiResponse } from "@/services/api";
import { type Post, postService } from "@/services/post.service";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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

const MAX_CAPTION = 500;
const MAX_IMAGES = 10;

const parseSelectedUris = (value: string | string[] | undefined): string[] => {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((uri): uri is string => typeof uri === "string" && uri.length > 0)
      .slice(0, MAX_IMAGES);
  } catch {
    return [];
  }
};

const parseHashtagsInput = (value: string) => {
  const normalized = value
    .split(/[,#]/g)
    .map((item) => item.trim().replace(/^#+/, "").toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const parseInitialHashtags = (value: string | undefined) => {
  if (!value) {
    return "";
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (item): item is string => typeof item === "string" && item.length > 0,
        )
        .join(", ");
    }
  } catch {
    // Keep original fallback below.
  }

  return parseHashtagsInput(value).join(", ");
};

export default function EditPostDetailsScreen() {
  const router = useRouter();
  const { request, loading, error } = useApi<ApiResponse<Post>>();
  const hydratedParamsKeyRef = useRef<string>("");

  const params = useLocalSearchParams<{
    postId?: string;
    caption?: string;
    hashtags?: string;
    selectedCount?: string;
    selectedUris?: string | string[];
    selectedMusic?: string;
    selectedMusicId?: string;
  }>();

  const postId = typeof params.postId === "string" ? params.postId : "";
  const initialCaption =
    typeof params.caption === "string" ? params.caption : "";
  const hashtagsParam = typeof params.hashtags === "string" ? params.hashtags : "";
  const selectedUrisParam = Array.isArray(params.selectedUris)
    ? params.selectedUris[0]
    : params.selectedUris;

  const hydratedParamsKey = `${postId}|${initialCaption}|${hashtagsParam}|${selectedUrisParam ?? ""}`;

  const initialHashtags = useMemo(
    () =>
      parseInitialHashtags(
        typeof params.hashtags === "string" ? params.hashtags : undefined,
      ),
    [params.hashtags],
  );

  const [caption, setCaption] = useState(initialCaption);
  const [hashtags, setHashtags] = useState(initialHashtags);

  const initialSelectedImageUris = useMemo(
    () => parseSelectedUris(selectedUrisParam),
    [selectedUrisParam],
  );
  const [selectedImageUris, setSelectedImageUris] = useState(
    initialSelectedImageUris,
  );

  useEffect(() => {
    if (hydratedParamsKeyRef.current === hydratedParamsKey) {
      return;
    }

    hydratedParamsKeyRef.current = hydratedParamsKey;

    setCaption(initialCaption);
    setHashtags(initialHashtags);
    setSelectedImageUris(initialSelectedImageUris);
  }, [
    hydratedParamsKey,
    initialCaption,
    initialHashtags,
    initialSelectedImageUris,
  ]);

  const selectedCount = selectedImageUris.length;

  const firstSelectedImage = selectedImageUris[0] ?? null;

  const selectedMusic =
    typeof params.selectedMusic === "string" ? params.selectedMusic : "";

  const selectedMusicId =
    typeof params.selectedMusicId === "string" &&
    params.selectedMusicId !== "null" &&
    params.selectedMusicId !== "undefined" &&
    params.selectedMusicId.length > 0
      ? params.selectedMusicId
      : null;

  const hashtagList = useMemo(() => parseHashtagsInput(hashtags), [hashtags]);

  const postPayload = useMemo(
    () => ({
      caption: caption.trim(),
      hashtags: hashtagList,
      musicId: selectedMusicId,
      existingImages: selectedImageUris,
    }),
    [caption, hashtagList, selectedImageUris, selectedMusicId],
  );

  const isPublishDisabled = useMemo(
    () => selectedImageUris.length === 0 || loading || !postId,
    [loading, postId, selectedImageUris.length],
  );

  const handleDeleteImage = (uri: string, index: number) => {
    Alert.alert("Xóa ảnh", "Bạn có chắc muốn xóa ảnh này không?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          setSelectedImageUris((prev) =>
            prev.filter(
              (item, itemIndex) => !(item === uri && itemIndex === index),
            ),
          );
        },
      },
    ]);
  };

  const handlePublish = async () => {
    if (!postId) {
      return;
    }

    console.log("Edit post payload:", postPayload);

    try {
      const res = await request(() =>
        postService.editPost(postId, postPayload),
      );
      if (!res?.data) {
        return;
      }
      console.log("Edit post success:", res.data);
      router.replace("/(tabs)/profile");
    } catch (e) {
      console.error("Edit post error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton href="/post-edit/music" />
        </View>

        <Text style={styles.headerTitle}>Chỉnh sửa bài viết</Text>

        <Pressable
          disabled={isPublishDisabled}
          style={styles.publishButtonWrap}
          onPress={() => {
            void handlePublish();
          }}
        >
          <Text
            style={[
              styles.publishButtonText,
              isPublishDisabled && styles.publishButtonTextDisabled,
            ]}
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.composeCard}>
          <View style={styles.composeHeaderRow}>
            <View style={styles.authorWrap}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={14} color="#6b7280" />
              </View>
              <Text style={styles.authorName}>Bạn</Text>
            </View>

            <Text style={styles.selectedInfoText}>
              Đã chọn {selectedCount} ảnh
            </Text>
          </View>

          <View style={styles.composeMainRow}>
            <TextInput
              value={caption}
              onChangeText={(text) => setCaption(text.slice(0, MAX_CAPTION))}
              placeholder="Viết chú thích..."
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              style={styles.captionInput}
            />

            <View style={styles.heroImageWrap}>
              {firstSelectedImage ? (
                <Image
                  source={{ uri: firstSelectedImage }}
                  style={styles.heroImage}
                />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Ionicons name="image-outline" size={18} color="#9ca3af" />
                </View>
              )}
            </View>
          </View>

          <Text style={styles.captionCounterText}>
            {caption.length}/{MAX_CAPTION}
          </Text>
        </View>

        <View style={styles.infoRowCard}>
          <View style={styles.infoRowLeft}>
            <Ionicons name="musical-notes-outline" size={18} color="#111" />

            <View style={styles.infoRowTextWrap}>
              <Text style={styles.infoRowLabel}>Nhạc</Text>
              <Text style={styles.selectedMusicText} numberOfLines={1}>
                {selectedMusic || "Chưa chọn nhạc"}
              </Text>
            </View>
          </View>

          <Text style={styles.infoRowBadge}>
            {selectedMusicId ? "Đã chọn" : "Không"}
          </Text>
        </View>

        <View style={styles.hashtagCard}>
          <View style={styles.hashtagLabelRow}>
            <Feather name="hash" size={16} color="#111" />
            <Text style={styles.fieldLabel}>Hashtag</Text>
          </View>

          <TextInput
            value={hashtags}
            onChangeText={setHashtags}
            placeholder="#fashion, #ootd"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            style={styles.hashtagInput}
          />

          <Text style={styles.helperText}>
            Tách bởi dấu phẩy hoặc #, ví dụ: #fashion, #ootd
          </Text>

          {hashtagList.length > 0 ? (
            <Text style={styles.hashtagPreviewText}>
              #{hashtagList.join(" #")}
            </Text>
          ) : null}
        </View>

        {selectedImageUris.length > 0 ? (
          <View style={styles.galleryCard}>
            <Text style={styles.galleryTitle}>Ảnh đã chọn</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previewRowContent}
            >
              {selectedImageUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.previewItemWrap}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <View style={styles.previewIndexBadge}>
                    <Text style={styles.previewIndexText}>{index + 1}</Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteImage(uri, index)}
                    style={styles.previewDeleteButton}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
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
    minHeight: 52,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#efefef",
  },
  headerLeft: {
    width: 48,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  publishButtonWrap: {
    minWidth: 48,
    alignItems: "flex-end",
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0095f6",
  },
  publishButtonTextDisabled: {
    color: "#9ca3af",
  },
  errorBanner: {
    marginHorizontal: 14,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorBannerText: {
    fontSize: 12,
    color: "#b91c1c",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    gap: 16,
    paddingBottom: 28,
  },
  composeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efefef",
    backgroundColor: "#fff",
    padding: 12,
    gap: 10,
  },
  composeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  authorName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  selectedInfoText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  composeMainRow: {
    minHeight: 108,
    flexDirection: "row",
    gap: 10,
  },
  captionInput: {
    flex: 1,
    minHeight: 108,
    fontSize: 15,
    color: "#111",
    paddingVertical: 2,
    textAlignVertical: "top",
  },
  heroImageWrap: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  captionCounterText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  infoRowCard: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efefef",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  infoRowTextWrap: {
    flex: 1,
  },
  infoRowLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  infoRowBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  selectedMusicText: {
    marginTop: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  hashtagCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efefef",
    backgroundColor: "#fff",
    padding: 12,
    gap: 8,
  },
  hashtagLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  hashtagInput: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
  },
  hashtagPreviewText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  galleryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efefef",
    backgroundColor: "#fff",
    padding: 12,
    gap: 10,
  },
  galleryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  previewRowContent: {
    gap: 8,
  },
  previewItemWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewIndexBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    paddingHorizontal: 4,
  },
  previewIndexText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  previewDeleteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  payloadHintCard: {
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
  },
  payloadHintTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
  },
  payloadHintText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
});
