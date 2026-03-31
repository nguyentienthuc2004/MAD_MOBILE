import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmToast: React.FC<Props> = ({
  visible,
  message,
  onConfirm,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <View
          style={[
            styles.container,
            { marginBottom: Math.max(8, insets.bottom) },
          ]}
        >
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.btnHalf}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnHalf}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  container: {
    width: "92%",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingTop: 12,
    paddingBottom: 0,
    overflow: "hidden",
    alignItems: "center",
  },
  message: {
    color: "#111",
    paddingHorizontal: 16,
    paddingBottom: 8,
    textAlign: "center",
  },
  buttonsRow: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 0,
  },
  btnHalf: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#007AFF", fontWeight: "700", fontSize: 16 },
  deleteText: { color: "#ff3b30", fontWeight: "700", fontSize: 16 },
});

export default ConfirmToast;
