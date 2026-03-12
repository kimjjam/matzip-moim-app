import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { registerPushToken } from "./src/lib/notifications";
import { useAuthStore } from "./src/store/useAuthStore";

export default function App() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) {
      registerPushToken();
    }
  }, [user]);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}