// Subpath imports, not the package root. The root barrel re-exports every
// weight in the family, and Metro treats each `.ttf` beside it as an asset, so
// importing from the root ships all fifteen Plex Sans files (~3.4MB) to load
// three of them. Each subpath pulls exactly one file.
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { IBMPlexSans_400Regular } from "@expo-google-fonts/ibm-plex-sans/400Regular";
import { IBMPlexSans_500Medium } from "@expo-google-fonts/ibm-plex-sans/500Medium";
import { IBMPlexSans_600SemiBold } from "@expo-google-fonts/ibm-plex-sans/600SemiBold";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { DarkTheme, ThemeProvider, Stack, type Theme } from "expo-router";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { assertDeployable, convexClient } from "@/lib/backend";
import { startNetworkListener } from "@/lib/network";
import { hydrateOutbox } from "@/lib/outbox";
import { hydrateCaches } from "@/lib/profileCache";
import { hydrateProgress } from "@/lib/progress";
import { Ambient } from "@/components/Ambient";
import { OutboxFlusher } from "@/components/SyncStatus";
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
  const [fontsLoaded, fontError] = Font.useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  /**
   * Local storage, hydrated before anything renders.
   *
   * This is not a nicety. The outbox keeps an in-memory mirror that
   * `enqueueAnswer` writes through; if the first answer landed before the
   * hydrate resolved, the hydrate would replace the mirror with what was on
   * disk and the answer would be gone from both memory and the next write. The
   * web gets this for free because localStorage is synchronous — there is no
   * window in which half of it is loaded. Holding the splash for one async read
   * is the price of having an outbox on a phone.
   */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    startNetworkListener();
    void Promise.all([
      hydrateProgress(),
      hydrateOutbox(),
      hydrateCaches(),
    ]).then(() => setHydrated(true));
  }, []);

  assertDeployable();

  useEffect(() => {
    // Hold the splash until the fonts resolve. A wrong-font frame is the most
    // visible possible way to look unbuilt, and Android will not let a later
    // swap fix a screenshot a user already saw. A font *error* also releases
    // it: a missing font should degrade to the system face, not hang forever.
    // Storage is not in this condition — a storage that fails to read still
    // renders, it just starts empty.
    if ((fontsLoaded || fontError) && hydrated) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, hydrated]);

  if ((!fontsLoaded && !fontError) || !hydrated) return null;

  return (
    <ThemeProvider value={theme}>
      {client ? (
        <ConvexAuthProvider
          client={client}
          // Convex Auth persists its session under `localStorage`, which React
          // Native does not have. Without this the provider throws on first
          // render: "`localStorage` is not available in this environment, set
          // the `storage` prop on `ConvexAuthProvider`". AsyncStorage already
          // implements the same async getItem/setItem/removeItem surface, so it
          // is a drop-in — and it means the session survives an app restart the
          // same way local progress does.
          storage={AsyncStorage}
        >
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
            <Stack.Screen name="account" />
          </Stack>
          {/* Above every screen, so the queue drains wherever you are. The web
              mounts its flusher per route; a phone navigates between four of
              them and the queue has to outlive all of them. */}
          <OutboxFlusher />
        </ConvexAuthProvider>
      ) : (
        <NoBackend />
      )}
      {/* One backdrop for every screen, mounted in the root layout the way the
          web mounts `AmbientBackground` in its own. It takes no touches, so it
          can sit above the stack; the web puts its blobs behind the content and
          its grain above it, and at these alphas the two are indistinguishable
          from one overlay. */}
      <Ambient />
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
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ink },
      }}
    >
      <Stack.Screen name="no-backend" />
    </Stack>
  );
}
