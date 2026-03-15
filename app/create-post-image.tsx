import BackButton from "@/components/BackButton";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_IMAGES = 10;
const SCREEN_WIDTH = Dimensions.get("window").width;
const PREVIEW_SIZE = SCREEN_WIDTH;
const THUMB_GAP = 1;
const THUMB_SIZE = (SCREEN_WIDTH - THUMB_GAP * 3) / 4;

export default function CreatePostImageScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [fallbackSelectedUris, setFallbackSelectedUris] = useState<string[]>([]);
  const [isMultiSelectEnabled, setIsMultiSelectEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const canContinue = selectedAssetIds.length > 0;

  const assetMap = useMemo(
    () => new Map(assets.map((item) => [item.id, item])),
    [assets]
  );

  const selectedOrderMap = useMemo(
    () =>
      new Map(selectedAssetIds.map((assetId, index) => [assetId, index + 1])),
    [selectedAssetIds]
  );

  const selectedPreviewUri = useMemo(() => {
    if (fallbackSelectedUris.length > 0) {
      return fallbackSelectedUris[0];
    }

    if (selectedAssetIds.length > 0) {
      const firstSelectedAsset = assetMap.get(selectedAssetIds[0]);
      if (firstSelectedAsset) {
        return firstSelectedAsset.uri;
      }
    }

    return assets[0]?.uri ?? null;
  }, [assetMap, assets, fallbackSelectedUris, selectedAssetIds]);

  const selectedAssetUris = useMemo(() => {
    if (fallbackSelectedUris.length > 0) {
      return fallbackSelectedUris.slice(0, MAX_IMAGES);
    }

    return selectedAssetIds
      .map((assetId) => assetMap.get(assetId)?.uri)
      .filter((uri): uri is string => Boolean(uri))
      .slice(0, MAX_IMAGES);
  }, [assetMap, fallbackSelectedUris, selectedAssetIds]);

  const selectionHelperText = useMemo(() => {
    if (hasPermission === false) {
      return "Cần cấp quyền thư viện để tiếp tục";
    }

    if (isMultiSelectEnabled) {
      return `Đã chọn ${selectedAssetIds.length}/${MAX_IMAGES}`;
    }

    if (selectedAssetIds.length === 0) {
      return "Chọn 1 ảnh để tiếp tục";
    }

    return "Chế độ chọn 1 ảnh";
  }, [hasPermission, isMultiSelectEnabled, selectedAssetIds.length]);

  const openSystemImagePicker = useCallback(async () => {
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
      setIsMultiSelectEnabled(normalized.length > 1);
    } catch (error) {
      console.log("System picker error:", error);
    }
  }, []);

  const fetchRecentAssets = useCallback(async () => {
    const baseOptions = {
      first: 160,
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

    return result.assets;
  }, []);

  const requestPermissionAndLoadAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const permissionResponse = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
      setHasPermission(permissionResponse.granted);

      if (!permissionResponse.granted) {
        setAssets([]);
        return;
      }

      const nextAssets = await fetchRecentAssets();
      setAssets(nextAssets);
    } catch (error) {
      console.log("Media library permission error:", error);
      setHasPermission(false);
    } finally {
      setLoadingAssets(false);
    }
  }, [fetchRecentAssets]);

  const handleSelectAsset = useCallback(
    (assetId: string) => {
      setFallbackSelectedUris([]);

      if (!isMultiSelectEnabled) {
        setSelectedAssetIds([assetId]);
        return;
      }

      setSelectedAssetIds((prev) => {
        if (prev.includes(assetId)) {
          return prev.filter((item) => item !== assetId);
        }

        if (prev.length >= MAX_IMAGES) {
          return prev;
        }

        return [...prev, assetId];
      });
    },
    [isMultiSelectEnabled]
  );

  useEffect(() => {
    void requestPermissionAndLoadAssets();
  }, [requestPermissionAndLoadAssets]);

  useEffect(() => {
    if (isMultiSelectEnabled) {
      return;
    }

    setSelectedAssetIds((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return [prev[0]];
    });
  }, [isMultiSelectEnabled]);

  useEffect(() => {
    if (fallbackSelectedUris.length > 0) {
      return;
    }

    if (assets.length === 0) {
      return;
    }

    if (selectedAssetIds.length > 0) {
      return;
    }

    setSelectedAssetIds([assets[0].id]);
  }, [assets, fallbackSelectedUris.length, selectedAssetIds.length]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await requestPermissionAndLoadAssets();
    } finally {
      setRefreshing(false);
    }
  }, [requestPermissionAndLoadAssets]);

  const toggleMultiSelect = useCallback(() => {
    setIsMultiSelectEnabled((prev) => !prev);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton href="/(tabs)/profile" />
        </View>

        <Text style={styles.headerTitle}>Bài viết mới</Text>

        <Pressable
          disabled={!canContinue}
          style={styles.headerRight}
          onPress={() =>
            router.push({
              pathname: "/create-post-music",
              params: {
                selectedCount: String(selectedAssetUris.length || selectedAssetIds.length),
                selectedUris: JSON.stringify(selectedAssetUris),
              },
            })
          }
        >
          <Text
            style={[
              styles.nextText,
              !canContinue && styles.nextTextDisabled,
            ]}
          >
            Tiếp
          </Text>
        </Pressable>
      </View>

      <View style={styles.previewSection}>
        {selectedPreviewUri ? (
          <Image source={{ uri: selectedPreviewUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Ionicons name="images-outline" size={28} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.previewPlaceholderText}>Chưa có ảnh nào</Text>
          </View>
        )}

        <View style={styles.previewActions}>
          <Pressable
            style={styles.previewActionButton}
            onPress={openSystemImagePicker}
            hitSlop={8}
          >
            <Ionicons name="images-outline" size={18} color="#fff" />
          </Pressable>

          <Pressable
            style={[
              styles.previewActionButton,
              isMultiSelectEnabled && styles.previewActionButtonActive,
            ]}
            onPress={toggleMultiSelect}
            hitSlop={8}
          >
            <Ionicons name="copy-outline" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.galleryHeader}>
        <Pressable
          style={styles.albumButton}
          onPress={requestPermissionAndLoadAssets}
          hitSlop={8}
        >
          <Text style={styles.albumButtonText}>Gần đây</Text>
          <Ionicons name="chevron-down" size={16} color="#111" />
        </Pressable>

        <Pressable
          style={[
            styles.multiSelectButton,
            isMultiSelectEnabled && styles.multiSelectButtonActive,
          ]}
          onPress={toggleMultiSelect}
        >
          <Ionicons
            name={isMultiSelectEnabled ? "checkmark-circle" : "ellipse-outline"}
            size={17}
            color={isMultiSelectEnabled ? "#fff" : "#111"}
          />
          <Text
            style={[
              styles.multiSelectButtonText,
              isMultiSelectEnabled && styles.multiSelectButtonTextActive,
            ]}
          >
            CHỌN NHIỀU
          </Text>
        </Pressable>
      </View>

      <Text style={styles.selectionHelperText}>{selectionHelperText}</Text>

      <View style={styles.galleryContent}>
        {loadingAssets ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#111" />
            <Text style={styles.centerStateText}>Đang tải ảnh...</Text>
          </View>
        ) : hasPermission === false ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateText}>
              Cần cấp quyền thư viện để hiển thị ảnh trên thiết bị
            </Text>

            <Pressable
              style={styles.primaryActionButton}
              onPress={requestPermissionAndLoadAssets}
            >
              <Text style={styles.primaryActionButtonText}>Cấp quyền thư viện</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionButton}
              onPress={openSystemImagePicker}
            >
              <Text style={styles.secondaryActionButtonText}>
                Mở trình chọn hệ thống
              </Text>
            </Pressable>
          </View>
        ) : assets.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateText}>Không có ảnh nào trong thư viện</Text>

            <Pressable
              style={styles.primaryActionButton}
              onPress={openSystemImagePicker}
            >
              <Text style={styles.primaryActionButtonText}>Chọn ảnh từ hệ thống</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(item) => item.id}
            numColumns={4}
            contentContainerStyle={styles.thumbnailContent}
            columnWrapperStyle={styles.thumbnailRow}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            renderItem={({ item }) => {
              const selectedOrder = selectedOrderMap.get(item.id);
              const isSelected = typeof selectedOrder === "number";

              return (
                <Pressable
                  style={styles.thumbnailItem}
                  onPress={() => handleSelectAsset(item.id)}
                >
                  <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />

                  {isSelected ? <View style={styles.thumbnailOverlay} /> : null}

                  <View
                    style={[
                      styles.thumbnailBadge,
                      isSelected && styles.thumbnailBadgeSelected,
                    ]}
                  >
                    {isSelected ? (
                      isMultiSelectEnabled ? (
                        <Text style={styles.thumbnailBadgeText}>{selectedOrder}</Text>
                      ) : (
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      )
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
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
    width: 42,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  headerRight: {
    minWidth: 42,
    alignItems: "flex-end",
  },
  nextText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0095f6",
  },
  nextTextDisabled: {
    color: "#9ca3af",
  },
  previewSection: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    backgroundColor: "#0f0f0f",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.82)",
  },
  previewActions: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
  },
  previewActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  previewActionButtonActive: {
    backgroundColor: "#0095f6",
  },
  galleryHeader: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  albumButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  albumButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginRight: 3,
  },
  multiSelectButton: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  multiSelectButtonActive: {
    backgroundColor: "#0095f6",
    borderColor: "#0095f6",
  },
  multiSelectButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
  },
  multiSelectButtonTextActive: {
    color: "#fff",
  },
  selectionHelperText: {
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 12,
    color: "#6b7280",
  },
  galleryContent: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerStateText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  primaryActionButton: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: "#111",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  primaryActionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryActionButton: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  thumbnailContent: {
    paddingBottom: 24,
  },
  thumbnailRow: {
    justifyContent: "space-between",
    marginBottom: THUMB_GAP,
  },
  thumbnailItem: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: "#f3f4f6",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  thumbnailBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#fff",
    backgroundColor: "rgba(17, 17, 17, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailBadgeSelected: {
    backgroundColor: "#0095f6",
    borderColor: "#fff",
  },
  thumbnailBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
});
