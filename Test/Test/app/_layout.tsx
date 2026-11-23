// app/_layout.tsx
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Provider, useDispatch, useSelector } from "react-redux";
import { loadStoredToken } from "../services/api";
import { AppDispatch, RootState, store } from "../store";
import { fetchMe, setHydrated } from "../store/authSlice";
// import "./global.css";

import { SafeAreaProvider } from "react-native-safe-area-context";

function AuthGate({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { isAuthenticated, hydrated, user } = useSelector(
    (s: RootState) => s.auth,
  );

  console.log("[AuthGate] render", {
    hydrated,
    isAuthenticated,
    tutorialSeen: user?.tutorial_seen,
    navKey: navState?.key,
    segments,
  });

  // 1. On mount: restore any saved token, then validate it against the API.
  useEffect(() => {
    console.log("[AuthGate] bootstrap effect starting");
    (async () => {
      let token: string | null = null;
      try {
        token = await loadStoredToken();
        console.log(
          "[AuthGate] token loaded:",
          token ? `${token.slice(0, 15)}...` : null,
        );
      } catch (e) {
        console.log("[AuthGate] loadStoredToken threw:", e);
      }

      if (!token) {
        console.log(
          "[AuthGate] no token — marking hydrated, staying signed out",
        );
        dispatch(setHydrated(true));
        return;
      }

      try {
        console.log("[AuthGate] calling fetchMe()...");
        const result = await dispatch(fetchMe()).unwrap();
        console.log("[AuthGate] fetchMe SUCCEEDED:", result);
      } catch (e) {
        console.log("[AuthGate] fetchMe FAILED:", e);
      } finally {
        console.log("[AuthGate] marking hydrated = true");
        dispatch(setHydrated(true));
      }
    })();
  }, []);

  // 2. Once hydrated, route based on auth + tutorial state.
  useEffect(() => {
    if (!hydrated) {
      console.log("[AuthGate] routing effect skipped — not hydrated yet");
      return;
    }
    if (!navState?.key) {
      console.log("[AuthGate] routing effect skipped — navState not ready yet");
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inTutorial = segments[0] === "tutorial";

    console.log("[AuthGate] routing decision", {
      inAuthGroup,
      inTutorial,
      isAuthenticated,
      tutorialSeen: user?.tutorial_seen,
    });

    if (!isAuthenticated && !inAuthGroup) {
      console.log("[AuthGate] -> redirecting to /(auth)/sign-in");
      router.replace("/(auth)/sign-in");
    } else if (isAuthenticated && user && !user.tutorial_seen && !inTutorial) {
      console.log("[AuthGate] -> redirecting to /tutorial");
      router.replace("/tutorial");
    } else if (
      isAuthenticated &&
      user?.tutorial_seen &&
      (inAuthGroup || inTutorial)
    ) {
      console.log("[AuthGate] -> redirecting to /(tabs)");
      router.replace("/(tabs)");
    } else {
      console.log("[AuthGate] -> no redirect needed, staying put");
    }
  }, [hydrated, isAuthenticated, user?.tutorial_seen, segments, navState?.key]);

  return (
    <>
      {children}
      {!hydrated && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0f131d",
              zIndex: 9999,
            },
          ]}
        >
          <ActivityIndicator color="#ffffff" size="large" />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
      </Provider>
    </SafeAreaProvider>
  );
}
