import { chatService } from "@/services/chat.service";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HomeHeader from "../../components/HomeHeader";
import OnlineUsersList from "../../components/OnlineUsersList";
import { Post } from "../../components/PostCard";
import PostsList from "../../components/PostsList";
import { UserAvatar } from "../../components/UserAvatarItem";

const defaultMusicUrl =
  "https://res.cloudinary.com/ddfrjhhro/video/upload/v1772453075/kayji_tizi-noi-nay-co-anh-em-co-anh-o-trong-oi-302568_apznck.mp3";

const onlineUsers: UserAvatar[] = [
  {
    id: "1",
    name: "Linh",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    isOnline: true,
  },
  {
    id: "2",
    name: "Minh",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    isOnline: true,
  },
  {
    id: "3",
    name: "An",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    isOnline: true,
  },
  {
    id: "4",
    name: "Huy",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    isOnline: true,
  },
  {
    id: "5",
    name: "Trang",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    isOnline: true,
  },
  {
    id: "6",
    name: "Nam",
    avatar:
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=200",
    isOnline: true,
  },
];

const posts: Post[] = [
  {
    id: "p1",
    userName: "Linh",
    userAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900",
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=900",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900",
    ],
    caption: "Outfit hôm nay đơn giản nhưng vẫn nổi bật ✨",
    likes: 1234,
    musicUrl: defaultMusicUrl,
  },
  {
    id: "p2",
    userName: "Minh",
    userAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900",
      "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=900",
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=900",
    ],
    caption: "Street style cuối tuần cùng team.",
    likes: 856,
    musicUrl: defaultMusicUrl,
  },
  {
    id: "p3",
    userName: "Trang",
    userAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    images: [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=900",
      "https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=900",
    ],
    caption: "Mix màu trung tính cho mùa này 🤍",
    likes: 2198,
    musicUrl: defaultMusicUrl,
  },
];

export default function Home() {
  const router = useRouter();

  const handleOpenChatFromPost = async (post: Post) => {
    // TODO: khi có dữ liệu thật, dùng _id user backend làm receiverId
    const receiverId = post.id;

    try {
      const res = await chatService.createRoom(receiverId);
      const room = res.data?.room;

      if (!room) {
        throw new Error("Không nhận được phòng chat");
      }

      router.push({
        pathname: "/chats/[roomId]",
        params: { roomId: room._id },
      });
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không mở được phòng chat");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HomeHeader />
      <View style={styles.content}>
        <PostsList
          posts={posts}
          onPressMessage={handleOpenChatFromPost}
          listHeaderComponent={
            <View style={styles.onlineSection}>
              <OnlineUsersList
                users={onlineUsers}
                onUserPress={(user) => console.log("Open user:", user.name)}
              />
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  onlineSection: {
    paddingTop: 12,
    paddingBottom: 14,
  },
});
