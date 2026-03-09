import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { ApiResponse } from "@/services/api";
import {  Post, postService } from "@/services/post.service";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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

const GRID_GAP = 2;
const GRID_ITEM_SIZE = (Dimensions.get("window").width - GRID_GAP * 2) / 3;

const ProfileScreen = () => {
  const user = useAuth((state) => state.user);
  console.log("User in ProfileScreen:", user);
  const {request, loading, error} = useApi<ApiResponse<Post[]>>();
  const [posts, setPosts] = useState<Post[]>([]);
  const logout = useAuth((state) => state.logout);
  useEffect(() => {
    const userId = user?._id;

    if (!userId) {
      setPosts([]);
      return;
    }

    const fetchPosts = async () => {
      console.log("Fetching posts for userId:", userId);
      const res = await request(() => postService.getPostsByUserId(userId));
      if (!res?.data) return;
      setPosts(res.data);
    };
    void fetchPosts();
  }, [request, user?._id]);

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
              uri: user?.avatarUrl,
            }}
            style={styles.avatar}
          />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
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
          <Text style={styles.displayName}>{user?.displayName}</Text>
          <Text style={styles.bioText}>
            {user?.bio}
          </Text>
        </View>

        <View style={styles.postsDivider}>
          <Ionicons name="grid-outline" size={20} color="#111" />
        </View>

        <View style={styles.gridWrap}>
          {posts.map((item,index) => (
            <Image key={index} source={{ uri: item.images[0] }} style={styles.gridImage} />
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
