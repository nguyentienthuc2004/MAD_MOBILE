import { socket } from "./socket";

let isListening = false;
let handlers = {
  onNew: null,
  onUpdate: null,
  onUnread: null,
};

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

  socket.on("notification:new", handlers.onNew);
  socket.on("notification:update", handlers.onUpdate);
  socket.on("notification:unread_count", handlers.onUnread);

  isListening = true;
};

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
