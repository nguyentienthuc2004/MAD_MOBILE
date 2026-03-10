import BackButton from "@/components/BackButton";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_IMAGES = 10;
const GRID_GAP = 8;
const GRID_ITEM_SIZE = (Dimensions.get("window").width - 32 - GRID_GAP * 2) / 3;
const MODAL_GRID_GAP = 3;
const MODAL_HORIZONTAL_PADDING = 6;
const MODAL_GRID_ITEM_SIZE =
  (Dimensions.get("window").width - MODAL_HORIZONTAL_PADDING * 2 - MODAL_GRID_GAP * 2) / 3;

export default function CreatePostImageScreen() {
  const router = useRouter();
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [fallbackSelectedUris, setFallbackSelectedUris] = useState<string[]>([]);
  const hasAutoOpenedPickerRef = useRef(false);

  const canContinue = selectedAssetIds.length > 0;

  const helperText = useMemo(() => {
    if (selectedAssetIds.length >= MAX_IMAGES) {
      return "Bạn đã chọn tối đa 10 ảnh";
    }

    return "Chọn từ 1 đến 10 ảnh để tiếp tục";
  }, [selectedAssetIds.length]);

  const selectedPreviewUris = useMemo(() => {
    if (fallbackSelectedUris.length > 0) {
      return fallbackSelectedUris.slice(0, 6);
    }

    if (selectedAssetIds.length === 0) return [];

    const assetMap = new Map(assets.map((item) => [item.id, item]));
    return selectedAssetIds
      .map((assetId) => assetMap.get(assetId))
      .filter((item): item is MediaLibrary.Asset => Boolean(item))
      .map((item) => item.uri)
      .slice(0, 6);
  }, [assets, fallbackSelectedUris, selectedAssetIds]);

  const openSystemImagePicker = useCallback(async () => {
    setPickerVisible(false);

    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES,
        quality: 1,
      });

      if (pickerResult.canceled) {
        return;
      }

      const normalized = pickerResult.assets.slice(0, MAX_IMAGES).map((item, index) => ({
        id: item.assetId ?? `picker-${index}-${item.uri}`,
        uri: item.uri,
      }));

      setSelectedAssetIds(normalized.map((item) => item.id));
      setFallbackSelectedUris(normalized.map((item) => item.uri));
    } catch (error) {
      console.log("System picker error:", error);
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const baseOptions = {
        first: 120,
        mediaType: [MediaLibrary.MediaType.photo],
        sortBy: [MediaLibrary.SortBy.creationTime],
      };

      const albums = await MediaLibrary.getAlbumsAsync();
      const preferredAlbum = albums.find((album) =>
        /download|picture|camera/i.test(album.title)
      );

      let result = preferredAlbum
        ? await MediaLibrary.getAssetsAsync({
            ...baseOptions,
            album: preferredAlbum.id,
          })
        : await MediaLibrary.getAssetsAsync(baseOptions);

      if (result.assets.length === 0 && preferredAlbum) {
        result = await MediaLibrary.getAssetsAsync(baseOptions);
      }

      setAssets(result.assets);
    } catch (error) {
      console.log("Load photos error:", error);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const openPhotoPicker = useCallback(async () => {
    setPickerVisible(true);

    try {
      const permissionResponse = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
      setHasPermission(permissionResponse.granted);

      if (!permissionResponse.granted) {
        setPickerVisible(false);
        return;
      }

      setFallbackSelectedUris([]);
      await loadPhotos();
    } catch (error) {
      console.log("MediaLibrary permission error:", error);
      await openSystemImagePicker();
    }
  }, [loadPhotos, openSystemImagePicker]);

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds((prev) => {
      if (prev.includes(assetId)) {
        return prev.filter((item) => item !== assetId);
      }

      if (prev.length >= MAX_IMAGES) {
        return prev;
      }

      return [...prev, assetId];
    });
  };

  useEffect(() => {
    if (hasAutoOpenedPickerRef.current) return;

    hasAutoOpenedPickerRef.current = true;

    const autoOpenTimer = setTimeout(() => {
      void openPhotoPicker();
    }, 200);

    return () => clearTimeout(autoOpenTimer);
  }, [openPhotoPicker]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <BackButton href="/(tabs)/profile" />
        <Text style={styles.headerTitle}>Bài viết mới</Text>
        <Pressable
          disabled={!canContinue}
          style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
          onPress={() =>
            router.push({
              pathname: "/create-post-details",
              params: { selectedCount: String(selectedAssetIds.length) },
            })
          }
        >
          <Text
            style={[
              styles.nextButtonText,
              !canContinue && styles.nextButtonTextDisabled,
            ]}
          >
            Tiếp
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Chọn ảnh cho bài viết mới</Text>
          <Text style={styles.summarySubTitle}>{helperText}</Text>
          <Text style={styles.summaryCounterText}>
            Đã chọn {selectedAssetIds.length}/{MAX_IMAGES}
          </Text>
        </View>

        {selectedPreviewUris.length > 0 ? (
          <View style={styles.gridWrap}>
            {selectedPreviewUris.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={styles.gridImage}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Chưa có ảnh nào được chọn</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPickerVisible(false)}
          />

          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ảnh từ điện thoại</Text>
              <Pressable onPress={() => setPickerVisible(false)}>
                <Text style={styles.sheetDoneText}>Xong</Text>
              </Pressable>
            </View>

            {loadingAssets ? (
              <View style={styles.modalCenterContent}>
                <ActivityIndicator size="small" color="#111" />
                <Text style={styles.modalHelperText}>Đang tải ảnh...</Text>
              </View>
            ) : hasPermission === false ? (
              <View style={styles.modalCenterContent}>
                <Text style={styles.modalHelperText}>
                  Cần cấp quyền thư viện để hiển thị ảnh
                </Text>
                <Pressable style={styles.permissionButton} onPress={openPhotoPicker}>
                  <Text style={styles.permissionButtonText}>Cấp quyền lại</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={assets}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.modalGridContent}
                columnWrapperStyle={styles.modalColumn}
                renderItem={({ item }) => {
                  const isSelected = selectedAssetIds.includes(item.id);

                  return (
                    <Pressable
                      style={styles.modalImageWrap}
                      onPress={() => toggleAssetSelection(item.id)}
                    >
                      <Image source={{ uri: item.uri }} style={styles.modalImage} />
                      <View
                        style={[
                          styles.checkCircle,
                          isSelected && styles.checkCircleSelected,
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={13} color="#fff" />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.modalCenterContent}>
                    <Text style={styles.modalHelperText}>
                      Không có ảnh nào trong thư viện
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
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
  nextButton: {
    minWidth: 86,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  nextButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  nextButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  nextButtonTextDisabled: {
    color: "#9ca3af",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 14,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    padding: 14,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  summarySubTitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  summaryCounterText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  gridImage: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 12,
  },
  emptyWrap: {
    height: 130,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  emptyText: {
    fontSize: 13,
    color: "#6b7280",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  sheetContainer: {
    height: "78%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  sheetHeader: {
    minHeight: 42,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  sheetDoneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
  },
  modalGridContent: {
    paddingBottom: 18,
    paddingHorizontal: MODAL_HORIZONTAL_PADDING,
  },
  modalColumn: {
    marginBottom: MODAL_GRID_GAP,
    justifyContent: "space-between",
  },
  modalImageWrap: {
    width: MODAL_GRID_ITEM_SIZE,
    height: MODAL_GRID_ITEM_SIZE,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  checkCircle: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(17, 17, 17, 0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#dbeafe",
  },
  modalCenterContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  modalHelperText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  permissionButton: {
    minWidth: 104,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    paddingHorizontal: 12,
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
});
