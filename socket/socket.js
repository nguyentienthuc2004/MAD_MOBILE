import { io } from "socket.io-client";

// URL backend cho Socket.IO
// Uu tien lay tu EXPO_PUBLIC_SOCKET_URL, fallback ve 10.0.2.2 cho Android emulator
const SOCKET_URL =
    process.env.EXPO_PUBLIC_SOCKET_URL || "http://10.0.2.2:3000";

/**
 * Ket noi Socket.IO toi backend.
 * @sideEffect Mo ket noi realtime va tu dong reconnect.
 */
export const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
});

// Event: ket noi thanh cong
socket.on("connect", () => {
    console.log("[SOCKET] Connected:", socket.id, "=>", SOCKET_URL);
});

// Event: ngat ket noi
socket.on("disconnect", (reason) => {
    console.log("[SOCKET] Disconnected:", reason);
});

// Event: loi ket noi
socket.on("connect_error", (err) => {
    console.log("[SOCKET] Connect error:", err.message);
});