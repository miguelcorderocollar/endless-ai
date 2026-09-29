// Subpath imports, not the package root. The root barrel re-exports every
// weight in the family, and Metro treats each `.ttf` beside it as an asset, so
// importing from the root ships all fifteen Plex Sans files (~3.4MB) to load
// three of them. Each subpath pulls exactly one file.
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { IBMPlexSans_400Regular } from "@expo-google-fonts/ibm-plex-sans/400Regular";
import { IBMPlexSans_500Medium } from "@expo-google-fonts/ibm-plex-sans/500Medium";
import { IBMPlexSans_600SemiBold } from "@expo-google-fonts/ibm-plex-sans/600SemiBold";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { ConvexProvider } from "convex/react";
import {
  DarkTheme,
  ThemeProvider,
  Stack,
  type Theme,
} from "expo-router";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { assertDeployable, convexClient } from "@/lib/backend";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden, or no splash to hold. Nothing to recover. */
});

/**
 * The same palette the web app's globals.css declares, handed to expo-router so
 * the navigation container's own background and text are the app's ink and
 * paper rather than the platform default. Without this the stack renders a
 * light chrome around a dark screen.
 */
const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.ink,
    card: colors.ink,
    text: colors.paper,
    border: colors.inkLine,
    primary: colors.signal,
  },
};

export default function RootLayout() {
  const client = convexClient();
  const [loaded, error] = Font.useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  assertDeployable();

  useEffect(() => {
    // Hold the splash until the fonts resolve. A wrong-font frame is the most
    // visible possible way to look unbuilt, and Android will not let a later
    // swap fix a screenshot a user already saw. A font *error* also releases
    // it: a missing font should degrade to the system face, not hang forever.
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={theme}>
      {client ? (
        <ConvexProvider client={client}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.ink },
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="categories" />
            <Stack.Screen name="profile" />
          </Stack>
        </ConvexProvider>
      ) : (
        <NoBackend />
      )}
      {/* No `backgroundColor`: edge-to-edge is on, so Android draws the
          system bars over the app's own ink and the prop no longer applies. */}
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

/**
 * The web app renders an inline "no Convex URL" shell rather than throwing, and
 * the native build does the same: a missing `EXPO_PUBLIC_CONVEX_URL` is a setup
 * mistake, and the fix is a sentence, not a stack trace.
 */
function NoBackend() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
      <Stack.Screen name="no-backend" />
    </Stack>
  );
}
