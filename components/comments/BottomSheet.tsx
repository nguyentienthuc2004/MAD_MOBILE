import React, { useEffect, useRef } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Option = {
  id?: string;
  label: string;
  style?: any; // allow passing color via { color: 'red' }
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  options: Option[];
};

const BottomSheet: React.FC<Props> = ({ visible, onClose, options }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    // ensure enough distance to fully hide the sheet including safe area
    outputRange: [800 + (insets.bottom || 0), 0],
  });

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              // ensure content sits above home indicator and sheet background fills safe area
              paddingBottom: Math.max(12, (insets.bottom || 0) + 12),
              // push the white sheet background into the physical safe area so it fully covers the device bottom
              marginBottom: -Math.max(0, insets.bottom || 0),
            },
          ]}
        >
          {options.map((opt, i) => {
            const textColor = opt.style?.color;
            return (
              <TouchableOpacity
                key={opt.id ?? i}
                style={styles.option}
                activeOpacity={0.75}
                onPress={() => {
                  opt.onPress();
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    textColor ? { color: textColor } : null,
                    opt.style?.fontWeight
                      ? { fontWeight: opt.style.fontWeight }
                      : null,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Hủy</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  option: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  optionText: { fontSize: 16, color: "#111" },
  dangerText: { color: "#ed4956", fontWeight: "600" },
  cancelButton: {
    marginTop: 10,
    marginHorizontal: 10,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
});

export default BottomSheet;
