import BackButton from "@/components/BackButton";
import { useApi } from "@/hooks/useApi";
import { API_BASE_URL, type ApiResponse } from "@/services/api";
import { type Music, musicService } from "@/services/music.service";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

type SearchParams = {
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
      .slice(0, 10);
  } catch {
    return [];
  }
};

const normalize = (text: string) => text.trim().toLowerCase();

const removeWrappingQuotes = (value: string) =>
  value.replace(/^['\"]+|['\"]+$/g, "");

const toEncodedUrl = (value: string) => {
  try {
    return encodeURI(value);
  } catch {
    return value;
  }
};

const dedupeStrings = (values: string[]) => {
  const output: string[] = [];

  for (const value of values) {
    if (!value || output.includes(value)) {
      continue;
    }

    output.push(value);
  }

  return output;
};

const buildMediaUrlCandidates = (rawUrl?: string): string[] => {
  if (!rawUrl) {
    return [];
  }

  const cleanedRaw = rawUrl.trim().replace(/\\/g, "/");
  if (!cleanedRaw) {
    return [];
  }

  const withoutQuotes = removeWrappingQuotes(cleanedRaw);
  if (!withoutQuotes) {
    return [];
  }

  const decodedIfNeeded = /^https?%3A/i.test(withoutQuotes)
    ? decodeURIComponent(withoutQuotes)
    : withoutQuotes;

  if (/^https?:\/\//i.test(decodedIfNeeded)) {
    const httpsCloudinary = /^http:\/\/res\.cloudinary\.com/i.test(decodedIfNeeded)
      ? decodedIfNeeded.replace(/^http:/i, "https:")
      : decodedIfNeeded;

    return dedupeStrings([
      decodedIfNeeded,
      httpsCloudinary,
      toEncodedUrl(decodedIfNeeded),
      toEncodedUrl(httpsCloudinary),
    ]);
  }

  if (decodedIfNeeded.startsWith("//")) {
    const httpsUrl = `https:${decodedIfNeeded}`;
    return dedupeStrings([httpsUrl, toEncodedUrl(httpsUrl)]);
  }

  // Handle values like "res.cloudinary.com/..." without protocol.
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:$|[/:?#])/i.test(decodedIfNeeded)) {
    const httpsUrl = `https://${decodedIfNeeded}`;
    const httpUrl = `http://${decodedIfNeeded}`;
    return dedupeStrings([
      httpsUrl,
      toEncodedUrl(httpsUrl),
      httpUrl,
      toEncodedUrl(httpUrl),
    ]);
  }

  if (decodedIfNeeded.startsWith("/")) {
    const absoluteUrl = `${API_ORIGIN}${decodedIfNeeded}`;
    return dedupeStrings([absoluteUrl, toEncodedUrl(absoluteUrl)]);
  }

  const fromApiOrigin = `${API_ORIGIN}/${decodedIfNeeded}`;
  return dedupeStrings([fromApiOrigin, toEncodedUrl(fromApiOrigin)]);
};

const resolveMediaUrl = (rawUrl?: string): string => {
  const candidates = buildMediaUrlCandidates(rawUrl);
  return candidates[0] ?? "";
};

export default function CreatePostMusicScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const carouselWidth = Math.max(screenWidth - 24, 1);
  const router = useRouter();
  const params = useLocalSearchParams<SearchParams>();
  const { request, loading, error } = useApi<ApiResponse<Music[]>>();

  const soundRef = useRef<Audio.Sound | null>(null);
  const previewRequestIdRef = useRef(0);

  const [musics, setMusics] = useState<Music[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const selectedImageUris = useMemo(
    () => parseSelectedUris(params.selectedUris),
    [params.selectedUris]
  );

  const selectedCountNumber = Number(params.selectedCount ?? selectedImageUris.length);
  const selectedCount =
    Number.isFinite(selectedCountNumber) && selectedCountNumber > 0
      ? selectedCountNumber
      : selectedImageUris.length;

  const selectedTrack = useMemo(
    () => musics.find((track) => track._id === selectedMusicId) ?? null,
    [musics, selectedMusicId]
  );

  const filteredMusics = useMemo(() => {
    const keyword = normalize(searchKeyword);

    if (!keyword) {
      return musics;
    }

    return musics.filter((track) => {
      const title = normalize(track.title);
      const artist = normalize(track.artist);
      return title.includes(keyword) || artist.includes(keyword);
    });
  }, [musics, searchKeyword]);

  const canContinue = selectedImageUris.length > 0 && Boolean(selectedTrack);

  const stopPreview = useCallback(async () => {
    if (!soundRef.current) {
      setPlayingMusicId(null);
      return;
    }

    try {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
    } catch (errorValue) {
      console.log("Stop preview error:", errorValue);
    } finally {
      soundRef.current = null;
      setPlayingMusicId(null);
    }
  }, []);

  const playPreview = useCallback(
    async (track: Music) => {
      const previewUrlCandidates = buildMediaUrlCandidates(track.url);

      if (previewUrlCandidates.length === 0) {
        setPreviewErrorMessage("Không tìm thấy URL nhạc hợp lệ để phát preview");
        return;
      }

      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      setPreviewLoadingId(track._id);
      setPreviewErrorMessage(null);

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        let lastError: unknown = null;

        for (const previewUrl of previewUrlCandidates) {
          let sound: Audio.Sound | null = null;

          try {
            const created = await Audio.Sound.createAsync(
              { uri: previewUrl },
              {
                shouldPlay: false,
                isMuted: false,
                isLooping: false,
                progressUpdateIntervalMillis: 250,
              }
            );

            sound = created.sound;

            if (previewRequestIdRef.current !== requestId) {
              await sound.unloadAsync();
              return;
            }

            sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
              if (!status.isLoaded) {
                return;
              }

              if (status.isPlaying) {
                setPlayingMusicId(track._id);
              }

              if (status.didJustFinish) {
                setPlayingMusicId((prev) => (prev === track._id ? null : prev));
              }
            });

            await sound.setIsMutedAsync(false);
            await sound.playAsync();

            soundRef.current = sound;
            setPlayingMusicId(track._id);
            return;
          } catch (previewError) {
            lastError = previewError;

            if (sound) {
              try {
                await sound.unloadAsync();
              } catch {
                // Ignore unload failures while trying fallback URLs.
              }
            }
          }
        }

        throw lastError ?? new Error("No valid preview URL candidate");
      } catch (errorValue) {
        console.log("Music preview error:", errorValue, {
          musicId: track._id,
          rawUrl: track.url,
          candidates: previewUrlCandidates,
        });
        setPlayingMusicId(null);
        setPreviewErrorMessage("Không thể phát preview bài này. Kiểm tra lại URL nhạc.");
      } finally {
        if (previewRequestIdRef.current === requestId) {
          setPreviewLoadingId(null);
        }
      }
    },
    []
  );

  const handleSelectMusic = useCallback(
    (track: Music) => {
      if (selectedMusicId === track._id && playingMusicId === track._id) {
        void stopPreview();
        return;
      }

      setSelectedMusicId(track._id);
      void playPreview(track);
    },
    [playPreview, playingMusicId, selectedMusicId, stopPreview]
  );

  const handleImageSwipeEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (selectedImageUris.length <= 1) {
        setActiveImageIndex(0);
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / carouselWidth);
      const boundedIndex = Math.max(0, Math.min(nextIndex, selectedImageUris.length - 1));
      setActiveImageIndex(boundedIndex);
    },
    [carouselWidth, selectedImageUris.length]
  );

  const fetchMusics = useCallback(async () => {
    const res = await request(() => musicService.getAllMusics());

    if (!res?.data) {
      return;
    }

    setMusics(res.data.filter((music) => !music.isDeleted));
  }, [request]);

  const handleNext = useCallback(() => {
    if (!selectedTrack) {
      return;
    }

    void stopPreview();

    router.push({
      pathname: "/create-post-details",
      params: {
        selectedCount: String(selectedCount),
        selectedUris: JSON.stringify(selectedImageUris),
        selectedMusic: `${selectedTrack.title} - ${selectedTrack.artist}`,
        selectedMusicId: selectedTrack._id,
        selectedMusicUrl: resolveMediaUrl(selectedTrack.url),
      },
    });
  }, [router, selectedCount, selectedImageUris, selectedTrack, stopPreview]);

  useEffect(() => {
    void fetchMusics();
  }, [fetchMusics]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchMusics();
    } finally {
      setRefreshing(false);
    }
  }, [fetchMusics]);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      previewRequestIdRef.current += 1;
      if (soundRef.current) {
        void soundRef.current.unloadAsync().catch((errorValue) => {
          const message =
            errorValue instanceof Error ? errorValue.message.toLowerCase() : "";

          if (!message.includes("interrupted")) {
            console.log("CreatePostMusic cleanup unload error:", errorValue);
          }
        });
        soundRef.current = null;
      }
    };
  }, []);

  const renderMusicRow = ({ item }: { item: Music }) => {
    const isSelected = item._id === selectedMusicId;
    const isLoadingPreview = item._id === previewLoadingId;
    const isPlaying = item._id === playingMusicId;
    const imageUrl = resolveMediaUrl(item.image);

    return (
      <Pressable
        onPress={() => handleSelectMusic(item)}
        style={[styles.trackRow, isSelected && styles.trackRowSelected]}
      >
        <View style={styles.trackLeftWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.trackCover} />
          ) : (
            <View style={styles.trackCoverPlaceholder}>
              <Ionicons name="musical-note" size={18} color="#6b7280" />
            </View>
          )}

          <View style={styles.trackTextWrap}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {item.artist || "Unknown artist"}
            </Text>
          </View>
        </View>

        <View style={styles.trackRightWrap}>
          {isLoadingPreview ? (
            <ActivityIndicator size="small" color="#111" />
          ) : isPlaying ? (
            <Ionicons name="volume-high" size={18} color="#111" />
          ) : null}

          {isSelected ? (
            <Ionicons name="checkmark-circle" size={20} color="#0095f6" />
          ) : (
            <Ionicons name="play-circle-outline" size={20} color="#6b7280" />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton href="/create-post-image" />
        </View>

        <Text style={styles.headerTitle}>Nhạc</Text>

        <Pressable
          style={styles.headerRight}
          disabled={!canContinue}
          onPress={handleNext}
        >
          <Text style={[styles.nextText, !canContinue && styles.nextTextDisabled]}>
            Tiếp
          </Text>
        </Pressable>
      </View>

      <View style={styles.musicSection}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#8e8e93" />
          <TextInput
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder="Tìm bài hát"
            placeholderTextColor="#8e8e93"
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.musicSectionHeader}>
          <Text style={styles.sectionTitle}>Dành cho bạn</Text>
          <Text style={styles.selectedCountText}>Đã chọn {selectedCount} ảnh</Text>
        </View>

        {previewErrorMessage ? (
          <Text style={styles.previewErrorText}>{previewErrorMessage}</Text>
        ) : null}

        <View style={styles.musicListWrap}>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.centerStateText}>Đang tải danh sách nhạc...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Text style={styles.centerStateText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={() => void fetchMusics()}>
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : filteredMusics.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.centerStateText}>Không tìm thấy bài hát phù hợp</Text>
            </View>
          ) : (
            <FlatList
              data={filteredMusics}
              keyExtractor={(item) => item._id}
              renderItem={renderMusicRow}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.musicListContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            />
          )}
        </View>
      </View>

      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Ảnh đã chọn</Text>

        {selectedImageUris.length > 0 ? (
          <View
            style={[styles.previewWrap, { width: carouselWidth, height: carouselWidth }]}
          >
            <FlatList
              data={selectedImageUris}
              keyExtractor={(item, index) => `${item}-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleImageSwipeEnd}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={[styles.previewImage, { width: carouselWidth, height: carouselWidth }]}
                />
              )}
            />

            <View style={styles.previewCounterBadge}>
              <Text style={styles.previewCounterText}>
                {activeImageIndex + 1}/{selectedImageUris.length}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={24} color="#6b7280" />
            <Text style={styles.emptyStateText}>
              Không lấy được danh sách ảnh. Vui lòng quay lại bước chọn ảnh.
            </Text>
          </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#efefef",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  headerLeft: {
    width: 52,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  headerRight: {
    minWidth: 52,
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
  musicSection: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  searchWrap: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#efefef",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    paddingVertical: 0,
  },
  musicSectionHeader: {
    marginTop: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  selectedCountText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  previewErrorText: {
    marginBottom: 8,
    fontSize: 12,
    color: "#dc2626",
  },
  musicListWrap: {
    height: 260,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  musicListContent: {
    paddingVertical: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
    marginLeft: 68,
  },
  trackRow: {
    minHeight: 60,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trackRowSelected: {
    backgroundColor: "#f5f9ff",
  },
  trackLeftWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 10,
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  trackCoverPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  trackTextWrap: {
    flexShrink: 1,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  trackArtist: {
    marginTop: 1,
    fontSize: 12,
    color: "#6b7280",
  },
  trackRightWrap: {
    minWidth: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  centerStateText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  retryButton: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  previewSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  previewWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0f0f0f",
  },
  previewImage: {
  },
  previewCounterBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewCounterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
});
