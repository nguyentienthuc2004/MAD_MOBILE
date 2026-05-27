import { socket } from "./socket";

let isListening = false;
let handlers = {
  onNew: null,
  onUpdate: null,
  onUnread: null,
};

/**
 * Bat dau lang nghe thong bao realtime qua socket.
 * @param onNew Callback khi co thong bao moi
 * @param onUpdate Callback khi thong bao duoc cap nhat
 * @param onUnread Callback khi server gui so thong bao chua doc
 * @returns void
 * @sideEffect Dang ky socket events.
 */
export const startNotificationListeners = ({ onNew, onUpdate, onUnread }) => {
  if (isListening) {
    stopNotificationListeners();
  }

  handlers.onNew = (payload) => {
    try {
      if (!payload || !payload.notification) return;
      console.log(
        "[socket] received notification:new",
        payload.notification._id,
      );
      onNew && onNew(payload.notification);
    } catch (e) {}
  };

  handlers.onUpdate = (payload) => {
    try {
      if (!payload || !payload.notification) return;
      console.log(
        "[socket] received notification:update",
        payload.notification._id,
      );
      onUpdate && onUpdate(payload.notification);
    } catch (e) {}
  };

  handlers.onUnread = (payload) => {
    try {
      if (!payload || typeof payload.unreadCount !== "number") return;
      console.log(
        "[socket] received notification:unread_count",
        payload.unreadCount,
      );
      onUnread && onUnread(payload.unreadCount);
    } catch (e) {}
  };

  // Event: thong bao moi
  socket.on("notification:new", handlers.onNew);
  // Event: thong bao cap nhat
  socket.on("notification:update", handlers.onUpdate);
  // Event: cap nhat so thong bao chua doc
  socket.on("notification:unread_count", handlers.onUnread);

  isListening = true;
};

/**
 * Dung lang nghe thong bao realtime.
 * @returns void
 * @sideEffect Huy dang ky socket events.
 */
export const stopNotificationListeners = () => {
  if (!isListening) return;
  try {
    if (handlers.onNew) socket.off("notification:new", handlers.onNew);
    if (handlers.onUpdate) socket.off("notification:update", handlers.onUpdate);
    if (handlers.onUnread)
      socket.off("notification:unread_count", handlers.onUnread);
  } catch (e) {}
  handlers = { onNew: null, onUpdate: null, onUnread: null };
  isListening = false;
};

/**
 * Join vao room thong bao cua user de nhan event realtime.
 * @param userId ID nguoi dung
 * @returns void
 * @sideEffect Emit socket event JOIN_USER.
 */
export const joinUserRoom = (userId) => {
  if (!userId) return;
  try {
    socket.emit("JOIN_USER", userId);
  } catch (e) {}
};

export default {
  startNotificationListeners,
  stopNotificationListeners,
  joinUserRoom,
};
