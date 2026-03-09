import { useAuth } from "@/hooks/useAuth";
import { Feather, Ionicons } from "@expo/vector-icons";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const POSTS = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=900",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900",
  "https://images.unsplash.com/photo-1445205170230-053b83016050?w=900",
  "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=900",
  "https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=900",
  "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=900",
];


const GRID_GAP = 2;
const GRID_ITEM_SIZE = (Dimensions.get("window").width - GRID_GAP * 2) / 3;

const ProfileScreen = () => {
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const profileHandle = user?.username ?? "fashionclub";
  const profileEmail = user?.email ?? "fashionclub@example.com";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.headerIconButton}>
            <Feather name="plus-square" size={22} color="#111" />
          </Pressable>

          <Pressable style={styles.headerIconButton} onPress={logout}>
            <Ionicons name="menu-outline" size={24} color="#111" />
          </Pressable>
        </View>

        <View style={styles.profileTopRow}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
            }}
            style={styles.avatar}
          />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{POSTS.length}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12.4k</Text>
              <Text style={styles.statLabel}>followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>248</Text>
              <Text style={styles.statLabel}>following</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioWrap}>
          <Text style={styles.displayName}>Fashion Club Official</Text>
          <Text style={styles.bioText}>
            Daily style inspiration. New drops every week.
          </Text>
          <Text style={styles.bioMeta}>@{profileHandle}</Text>
          <Text style={styles.bioMeta}>{profileEmail}</Text>
          <Text style={styles.bioLink}>fashionclub.co</Text>
        </View>

        <View style={styles.postsDivider}>
          <Ionicons name="grid-outline" size={20} color="#111" />
        </View>

        <View style={styles.gridWrap}>
          {POSTS.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.gridImage} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  headerRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statsRow: {
    flex: 1,
    marginLeft: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    minWidth: 70,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 13,
    color: "#4b5563",
  },
  bioWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  displayName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  bioText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#111",
  },
  bioMeta: {
    marginTop: 2,
    fontSize: 13,
    color: "#6b7280",
  },
  bioLink: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  postsDivider: {
    height: 42,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  gridImage: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
});

export default ProfileScreen;
