import { io } from "socket.io-client";

// URL backend cho Socket.IO
// Ưu tiên lấy từ EXPO_PUBLIC_SOCKET_URL, fallback về 10.0.2.2 cho Android emulator
const SOCKET_URL =
    process.env.EXPO_PUBLIC_SOCKET_URL || "http://10.0.2.2:3000";

export const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
});

socket.on("connect", () => {
    console.log("[SOCKET] Connected:", socket.id, "=>", SOCKET_URL);
});

socket.on("disconnect", (reason) => {
    console.log("[SOCKET] Disconnected:", reason);
});

socket.on("connect_error", (err) => {
    console.log("[SOCKET] Connect error:", err.message);
});