import { type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Rise } from "@/components/rise";
import { colors, fonts, GUTTER, label } from "@/theme";

/**
 * The native `Popup` (`src/components/Popup.tsx`): dimmed overlay, centred
 * sharp-cornered panel, × to close.
 *
 * `Modal` rather than an absolutely-positioned overlay because a phone is
 * edge-to-edge and the status bar and gesture bar sit over the app — a dialog
 * that ignores them is clipped by the notch. `Modal` handles the safe area, the
 * back button, and the fact that the screen behind is not tappable.
 *
 * Android's hardware back closes it, which is the same intent as the web's
 * Escape. The first field autofocuses on the web; here `autoFocus` is left to
 * the caller, because a keyboard sliding up under a `rise` animation on a short
 * screen is worse than making the user tap the field.
 */
export function Popup({
  label: kicker,
  title,
  onClose,
  children,
}: {
  label: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Siblings, not nested: a tap on the panel must never reach the scrim.
          Nested Pressables both fire in React Native — the inner noop and the
          outer close — so the web's "click the overlay to dismiss" cannot be a
          Pressable wrapped around the panel. The scrim sits behind and the
          panel above it; taps land on one or the other, never both. */}
      <View style={styles.scrim}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
        />
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.bar}>
            <Text style={[label, styles.kicker]}>{kicker}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="close"
              onPress={onClose}
              hitSlop={14}
            >
              <Text style={[label, styles.close]}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>{title}</Text>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Rise>{children}</Rise>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(10,11,13,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: GUTTER,
  },
  panel: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "86%",
    borderWidth: 1,
    borderColor: colors.inkLine,
    backgroundColor: colors.inkRaised,
    padding: 24,
  },
  bar: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  kicker: { color: colors.muted },
  close: { color: colors.muted, fontSize: 20, lineHeight: 18 },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.paper,
    marginTop: 8,
  },
  body: { marginTop: 20 },
  bodyContent: { paddingBottom: 8 },
});
