import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, GUTTER, label } from "@/theme";

/**
 * Mirrors the web app's "No Convex URL" shell (`ConvexClientProvider.tsx`): a
 * missing backend URL is a setup mistake, and the useful thing is to say which
 * variable to set rather than to fail somewhere deeper in the query.
 */
export default function NoBackend() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[label, styles.kicker]}>backend not configured</Text>
        <Text style={styles.title}>No Convex URL</Text>
        <Text style={styles.copy}>
          This build has no backend to draw questions from. Set{" "}
          <Text style={styles.code}>EXPO_PUBLIC_CONVEX_URL</Text> in{" "}
          <Text style={styles.code}>apps/mobile/.env</Text> — see{" "}
          <Text style={styles.code}>docs/deployment.md</Text> for which deployment that
          should point at.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  body: { padding: GUTTER, paddingTop: 56, flex: 1 },
  kicker: { color: colors.muted },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.paper,
    marginTop: 12,
  },
  copy: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
    marginTop: 18,
  },
  code: { fontFamily: fonts.mono, color: colors.paper },
});
