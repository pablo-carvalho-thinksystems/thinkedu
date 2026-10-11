import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { LoginSession } from "./LoginScreen";
const key = "thinkedu.auth.v1";
const api = process.env.EXPO_PUBLIC_API_URL;
export async function saveSession(session: LoginSession) {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(key, JSON.stringify({ api, session }), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
export async function clearSession() {
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(key);
}
export async function readSession(): Promise<LoginSession | undefined> {
  if (Platform.OS === "web") return;
  const value = await SecureStore.getItemAsync(key);
  if (!value) return;
  try {
    const stored = JSON.parse(value);
    if (
      stored.api === api &&
      typeof stored.session?.token === "string" &&
      stored.session.actor?.id
    )
      return stored.session;
  } catch {}
  await clearSession();
}
