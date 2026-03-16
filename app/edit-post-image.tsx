import BackButton from "@/components/BackButton";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
const ASSET_PAGE_SIZE = 200;
const PREFERRED_ALBUM_TITLE_REGEX = /downloads?|tai xuong|tai ve/i;
const TRASH_PATH_REGEX = /(?:^|[\\/])(?:\.trashed?|\.trash(?:es)?|trash|recycle(?:\s*bin)?|thung\s*rac)(?:[\\/]|$)/i;
const IMAGE_FILE_EXT_REGEX = /\.(avif|bmp|gif|heic|heif|jfif|jpe?g|png|webp)$/i;

type SelectedImage = {
  id: string;
  uri: string;
};

type SearchParams = {
  postId?: string;
  caption?: string;
  hashtags?: string;
  selectedMusicId?: string;
  selectedCount?: string;
  selectedUris?: string | string[];
};

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

const toInitialSelectedImages = (uris: string[]): SelectedImage[] =>
  uris.map((uri, index) => ({
    id: `existing-${index}-${uri}`,
    uri,
  }));

const mergeSelectedImages = (
  current: SelectedImage[],
  incoming: SelectedImage[],
) => {
  const existingUris = new Set(current.map((item) => item.uri));
  const merged = [...current];

  for (const image of incoming) {
    if (existingUris.has(image.uri)) {
      continue;
    }

    merged.push(image);
    existingUris.add(image.uri);

    if (merged.length >= MAX_IMAGES) {
      break;
    }
  }

  return merged.slice(0, MAX_IMAGES);
};

const normalizeAlbumTitle = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isLikelyImageAsset = (asset: MediaLibrary.Asset) => {
  if (asset.mediaType === MediaLibrary.MediaType.photo) {
    return true;
  }

  const source = `${asset.filename ?? ""} ${asset.uri ?? ""}`;
  return IMAGE_FILE_EXT_REGEX.test(source);
};

const normalizeUriForCheck = (uri?: string | null) => {
  if (!uri) {
    return "";
  }

  try {
    return decodeURIComponent(uri).replace(/\\/g, "/").toLowerCase();
  } catch {
    return uri.replace(/\\/g, "/").toLowerCase();
  }
};

const isTrashUri = (uri?: string | null) => {
  const normalized = normalizeUriForCheck(uri);
  if (!normalized) {
    return false;
  }

  return TRASH_PATH_REGEX.test(normalized);
};

const canLoadImageUri = (uri: string) =>
  new Promise<boolean>((resolve) => {
    try {
      Image.getSize(
        uri,
        () => resolve(true),
        () => resolve(false),
      );
    } catch {
      resolve(false);
    }
  });

const isRemoteUri = (uri: string) => /^https?:\/\//i.test(uri);

export default function EditPostImageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<SearchParams>();
  const hydratedSelectionKeyRef = useRef<string>("");
  const loadRequestIdRef = useRef(0);

  const postId = typeof params.postId === "string" ? params.postId : "";
  const initialCaption = typeof params.caption === "string" ? params.caption : "";
  const initialHashtags = typeof params.hashtags === "string" ? params.hashtags : "";
  const selectedUrisParam = Array.isArray(params.selectedUris)
    ? params.selectedUris[0]
    : params.selectedUris;
  const selectedMusicId =
    typeof params.selectedMusicId === "string" ? params.selectedMusicId : "";
  const initialSelectedUris = useMemo(
    () => parseSelectedUris(selectedUrisParam),
    [selectedUrisParam],
  );
  const initialSelectionKey = `${postId}|${selectedUrisParam ?? ""}`;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>(() =>
    toInitialSelectedImages(initialSelectedUris),
  );
  const [isMultiSelectEnabled, setIsMultiSelectEnabled] = useState(
    initialSelectedUris.length > 1,
  );
  const [refreshing, setRefreshing] = useState(false);

  const assetMap = useMemo(
    () => new Map(assets.map((item) => [item.id, item])),
    [assets]
  );

  const selectedOrderMap = useMemo(
    () =>
      new Map(selectedImages.map((item, index) => [item.id, index + 1])),
    [selectedImages]
  );

  const selectedPreviewUri = useMemo(() => {
    if (selectedImages.length > 0) {
      return selectedImages[0].uri;
    }

    return assets[0]?.uri ?? null;
  }, [assets, selectedImages]);

  const selectedAssetUris = useMemo(() => {
    return selectedImages.map((item) => item.uri).slice(0, MAX_IMAGES);
  }, [selectedImages]);

  const canContinue = selectedAssetUris.length > 0;

  const selectionHelperText = useMemo(() => {
    if (hasPermission === false) {
      return "Cần cấp quyền thư viện để tiếp tục";
    }

    if (selectedAssetUris.length > 0) {
      return `Đã chọn ${selectedAssetUris.length}/${MAX_IMAGES}`;
    }

    if (selectedAssetUris.length === 0) {
      return "Chọn 1 ảnh để tiếp tục";
    }

    return "Chế độ chọn 1 ảnh";
  }, [hasPermission, isMultiSelectEnabled, selectedAssetUris.length]);

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

      setSelectedImages((prev) => {
        const merged = mergeSelectedImages(prev, normalized);
        setIsMultiSelectEnabled(merged.length > 1);

        if (prev.length + normalized.length > MAX_IMAGES) {
          Alert.alert("Giới hạn ảnh", `Chỉ được chọn tối đa ${MAX_IMAGES} ảnh.`);
        }

        return merged;
      });
    } catch (error) {
      console.log("System picker error:", error);
    }
  }, []);

  const fetchAllPhotoAssets = useCallback(async (albumId?: string) => {
    let hasNextPage = true;
    let after: string | undefined;
    const allAssets: MediaLibrary.Asset[] = [];

    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        first: ASSET_PAGE_SIZE,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.unknown],
        sortBy: [MediaLibrary.SortBy.creationTime],
        ...(albumId ? { album: albumId } : {}),
        ...(after ? { after } : {}),
      });

      allAssets.push(...page.assets);

      if (!page.hasNextPage || !page.endCursor || page.assets.length === 0) {
        hasNextPage = false;
      } else {
        after = page.endCursor;
      }
    }

    return Array.from(new Map(allAssets.map((item) => [item.id, item])).values())
      .filter(isLikelyImageAsset)
      .sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0));
  }, []);

  const hydrateLiveDownloadAssets = useCallback(
    async (items: MediaLibrary.Asset[]) => {
      const resolved = await Promise.all(
        items.map(async (asset) => {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(asset.id);
            const resolvedUri = info.localUri ?? asset.uri;

            if (!resolvedUri) {
              return null;
            }

            if (isTrashUri(resolvedUri) || isTrashUri(asset.uri)) {
              return null;
            }

            const isReadable = await canLoadImageUri(resolvedUri);
            if (!isReadable) {
              return null;
            }

            return {
              ...asset,
              uri: resolvedUri,
            };
          } catch {
            return null;
          }
        }),
      );

      return resolved
        .filter((item): item is MediaLibrary.Asset => Boolean(item))
        .sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0));
    },
    [],
  );

  const fetchRecentAssets = useCallback(async () => {
    const albums = await MediaLibrary.getAlbumsAsync();
    const preferredAlbums = albums.filter((album) =>
      PREFERRED_ALBUM_TITLE_REGEX.test(normalizeAlbumTitle(album.title))
    );

    if (preferredAlbums.length === 0) {
      return [];
    }

    const groupedAssets = await Promise.all(
      preferredAlbums.map((album) => fetchAllPhotoAssets(album.id))
    );

    const mergedAssets = Array.from(
      new Map(groupedAssets.flat().map((item) => [item.id, item])).values()
    ).sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0));

    return hydrateLiveDownloadAssets(mergedAssets);
  }, [fetchAllPhotoAssets, hydrateLiveDownloadAssets]);

  const requestPermissionAndLoadAssets = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    setLoadingAssets(true);
    try {
      const permissionResponse = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setHasPermission(permissionResponse.granted);

      if (!permissionResponse.granted) {
        setAssets([]);
        return;
      }

      const nextAssets = await fetchRecentAssets();

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setAssets(nextAssets);

      const nextAssetUris = new Set(nextAssets.map((item) => item.uri));

      setSelectedImages((prev) => {
        const filtered = prev.filter(
          (image) => isRemoteUri(image.uri) || nextAssetUris.has(image.uri),
        );

        if (filtered.length !== prev.length) {
          setIsMultiSelectEnabled(filtered.length > 1);
        }

        return filtered;
      });
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      console.log("Media library permission error:", error);
      setHasPermission(false);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoadingAssets(false);
      }
    }
  }, [fetchRecentAssets]);

  const handleSelectAsset = useCallback(
    (assetId: string) => {
      const asset = assetMap.get(assetId);

      if (!asset?.uri) {
        return;
      }

      setSelectedImages((prev) => {
        if (prev.some((item) => item.id === assetId)) {
          const next = prev.filter((item) => item.id !== assetId);
          setIsMultiSelectEnabled(next.length > 1);
          return next;
        }

        if (prev.length >= MAX_IMAGES) {
          Alert.alert("Giới hạn ảnh", `Chỉ được chọn tối đa ${MAX_IMAGES} ảnh.`);
          return prev;
        }

        const next = [...prev, { id: assetId, uri: asset.uri }];
        setIsMultiSelectEnabled(next.length > 1);
        return next;
      });
    },
    [assetMap]
  );

  useEffect(() => {
    void requestPermissionAndLoadAssets();
  }, [requestPermissionAndLoadAssets]);

  useEffect(() => {
    const subscription = MediaLibrary.addListener(() => {
      void requestPermissionAndLoadAssets();
    });

    return () => {
      subscription.remove();
    };
  }, [requestPermissionAndLoadAssets]);

  useEffect(() => {
    if (hydratedSelectionKeyRef.current === initialSelectionKey) {
      return;
    }

    hydratedSelectionKeyRef.current = initialSelectionKey;

    if (initialSelectedUris.length === 0) {
      setSelectedImages([]);
      setIsMultiSelectEnabled(false);
      return;
    }

    setSelectedImages(toInitialSelectedImages(initialSelectedUris));
    setIsMultiSelectEnabled(initialSelectedUris.length > 1);
  }, [initialSelectedUris, initialSelectionKey]);

  useEffect(() => {
    if (initialSelectedUris.length > 0) {
      return;
    }

    if (assets.length === 0) {
      return;
    }

    if (selectedImages.length > 0) {
      return;
    }

    setSelectedImages([
      {
        id: assets[0].id,
        uri: assets[0].uri,
      },
    ]);
  }, [assets, initialSelectedUris.length, selectedImages.length]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await requestPermissionAndLoadAssets();
    } finally {
      setRefreshing(false);
    }
  }, [requestPermissionAndLoadAssets]);

  const handleDeleteSelectedImage = useCallback((image: SelectedImage) => {
    Alert.alert("Xóa ảnh", "Bạn có chắc muốn xóa ảnh này không?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          setSelectedImages((prev) => {
            const next = prev.filter((item) => item.id !== image.id);
            setIsMultiSelectEnabled(next.length > 1);
            return next;
          });
        },
      },
    ]);
  }, []);

  const toggleMultiSelect = useCallback(() => {
    setIsMultiSelectEnabled((prev) => !prev);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton href="/post-detail" />
        </View>

        <Text style={styles.headerTitle}>Chỉnh sửa bài viết</Text>

        <Pressable
          disabled={!canContinue}
          style={styles.headerRight}
          onPress={() =>
            router.push({
              pathname: "/post-edit/music",
              params: {
                postId,
                caption: initialCaption,
                hashtags: initialHashtags,
                selectedMusicId,
                selectedCount: String(selectedAssetUris.length),
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

      <View style={styles.selectedStripWrap}>
        <Text style={styles.selectedStripTitle}>Ảnh đã chọn</Text>
        {selectedImages.length > 0 ? (
          <FlatList
            data={selectedImages}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedStripContent}
            renderItem={({ item, index }) => (
              <View style={styles.selectedImageItem}>
                <Image source={{ uri: item.uri }} style={styles.selectedImageThumb} />
                <View style={styles.selectedImageIndexBadge}>
                  <Text style={styles.selectedImageIndexText}>{index + 1}</Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteSelectedImage(item)}
                  style={styles.deleteSelectedImageButton}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            )}
          />
        ) : (
          <Text style={styles.emptySelectedText}>Chưa có ảnh nào được chọn</Text>
        )}
      </View>

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
  selectedStripWrap: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  selectedStripTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  selectedStripContent: {
    gap: 8,
    paddingBottom: 4,
  },
  selectedImageItem: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  selectedImageThumb: {
    width: "100%",
    height: "100%",
  },
  selectedImageIndexBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 4,
  },
  selectedImageIndexText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  deleteSelectedImageButton: {
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
  emptySelectedText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
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
