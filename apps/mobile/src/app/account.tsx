import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { forgetProfile, syncOnSignIn } from "@/lib/account";
import { convexClient } from "@/lib/backend";
import { BOTTOM_INSET, colors, fonts, GUTTER, label } from "@/theme";

type Flow = "signIn" | "signUp";

/**
 * The web's `SignInForm` (`src/components/Account.tsx`) rebuilt in native
 * views, deliberately keeping its look: underline-only inputs with the field
 * name as the placeholder, a filled-signal submit, and the flow swap and
 * "forget me" links underneath.
 *
 * Email and password only. No verification and no reset, because both need a
 * sending domain the project does not have — which is why the server-side
 * Password provider is configured that way (#2).
 *
 * The one thing that must match exactly is the *payload*, not the pixels.
 * Convex Auth reads a `flow` field out of the submitted params, and a hidden
 * `<input name="flow">` in the web form is where it comes from. Leave it out and
 * the library assumes `signUp`, so signing in with an existing account runs the
 * signup password rules and fails with a length complaint about a password that
 * is perfectly long enough.
 */
function friendlyError(raw: unknown, flow: Flow): string {
  const message = raw instanceof Error ? raw.message : String(raw);
  if (/already exists|already registered|taken/i.test(message)) {
    return "That email already has an account. Sign in instead.";
  }
  if (
    /InvalidPassword|invalid credentials|verify the password/i.test(message)
  ) {
    return "That email and password do not match.";
  }
  if (/Invalid password|needs 8\+ characters|too short/i.test(message)) {
    return "Password needs 8 or more characters.";
  }
  if (/valid email|InvalidArgument|email address/i.test(message)) {
    return "That does not look like an email address.";
  }
  if (/fetch|network|failed to|timeout/i.test(message)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return flow === "signIn"
    ? "Could not sign in. Try again."
    : "Could not create the account.";
}

export default function AccountScreen() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const client = convexClient();

  // Arriving here with a live session means the deep link or a restored
  // session sent you to sign in for no reason. Send them somewhere useful.
  useEffect(() => {
    if (isAuthenticated) router.dismissTo("/");
  }, [isAuthenticated]);

  const submit = useCallback(() => {
    if (busy) return;
    if (client === null) {
      setError("No backend configured for this build.");
      return;
    }
    setBusy(true);
    setError(null);

    // A plain object, not a FormData: the library only calls `.entries()` when
    // it is handed a real FormData, and React Native's FormData has no `.get()`
    // anyway, so the object is the reliable path on this platform. `flow` is
    // the field the web form supplies via a hidden input.
    void signIn("password", { email: email.trim(), password, flow }).then(
      async () => {
        await syncOnSignIn(client);
        setBusy(false);
        router.dismissTo("/");
      },
      (cause: unknown) => {
        setBusy(false);
        setError(friendlyError(cause, flow));
      },
    );
  }, [busy, client, email, flow, password, signIn]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.bar}>
          <Text style={styles.title}>Account</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Text style={styles.muted}>close</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[label, styles.kicker]}>
            {flow === "signIn" ? "sign in" : "create account"}
          </Text>
          <Text style={styles.headline}>
            {flow === "signIn"
              ? "Sign in to Endless AI"
              : "Keep your Elo everywhere"}
          </Text>
          <Text style={styles.copy}>
            One account keeps your Elo, streak and done list on every device.
            Guests keep playing locally — nothing is lost by waiting.
          </Text>

          <View style={styles.form}>
            <Field
              name="email"
              value={email}
              onChangeText={setEmail}
              placeholder="email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              testID="auth-email"
            />
            <Field
              name="password"
              value={password}
              onChangeText={setPassword}
              placeholder="password (8+)"
              secureTextEntry
              autoCapitalize="none"
              autoComplete={
                flow === "signUp" ? "new-password" : "current-password"
              }
              testID="auth-password"
            />

            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                flow === "signIn" ? "Sign in" : "Create account"
              }
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={submit}
              style={({ pressed }) => [
                styles.submit,
                pressed && styles.submitPressed,
                busy && styles.busy,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.submitLabel}>
                  {flow === "signIn" ? "sign in" : "create account"}
                </Text>
              )}
            </Pressable>

            <View style={styles.links}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  flow === "signIn" ? "Create a new account" : "Sign in instead"
                }
                onPress={() => {
                  setFlow(flow === "signIn" ? "signUp" : "signIn");
                  setError(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.link}>
                  {flow === "signIn"
                    ? "new here? sign up"
                    : "have an account? sign in"}
                </Text>
              </Pressable>

              {isAuthenticated ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  onPress={() => {
                    // Drop the cached identity too, so the masthead goes back to
                    // "sign in" immediately rather than showing the name of an
                    // account that no longer has a session.
                    forgetProfile();
                    void signOut();
                    router.dismissTo("/");
                  }}
                  hitSlop={8}
                >
                  <Text style={[styles.link, styles.faint]}>forget me</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  name,
  testID,
  ...input
}: { name: string; testID: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...input}
      testID={testID}
      accessibilityLabel={name}
      style={styles.input}
      placeholderTextColor="rgba(111,117,128,0.5)"
      autoCorrect={false}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.ink },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUTTER,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inkLine,
  },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.paper },
  muted: { ...label, color: colors.muted },
  body: { padding: GUTTER, paddingTop: 40, paddingBottom: BOTTOM_INSET },
  kicker: { color: colors.muted },
  headline: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.paper,
    marginTop: 10,
  },
  copy: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    marginTop: 14,
    marginBottom: 36,
  },
  form: { maxWidth: 320, gap: 12 },
  // The web underlines rather than boxes its fields: a transparent background
  // and a bottom border, with the field name as the placeholder.
  input: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.paper,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: colors.inkLine,
    paddingVertical: 6,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: colors.fail,
  },
  submit: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.signal,
    borderWidth: 1,
    borderColor: colors.signal,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  submitPressed: { backgroundColor: colors.paper, borderColor: colors.paper },
  busy: { opacity: 0.7 },
  submitLabel: { ...label, color: colors.ink },
  links: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  link: { ...label, color: colors.muted },
  faint: { color: "rgba(111,117,128,0.6)" },
});
