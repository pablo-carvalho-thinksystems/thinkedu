import React, { useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  releasePolicy,
  updateAvailable,
  type ReleasePolicy,
} from "../../../packages/core/release.mjs";
const endpoint =
  process.env.EXPO_PUBLIC_VERSION_URL ||
  (process.env.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "") + "/app/version"
    : "");
export function VersionNotice() {
  const [update, setUpdate] = useState<
      (ReleasePolicy & { required: boolean }) | null
    >(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!endpoint || Platform.OS === "web") return;
    let alive = true,
      last = 0;
    async function check() {
      if (Date.now() - last < 300000) return;
      last = Date.now();
      const abort = new AbortController(),
        timer = setTimeout(() => abort.abort(), 8000);
      try {
        const response = await fetch(endpoint + "?platform=" + Platform.OS, {
          signal: abort.signal,
        });
        if (!response.ok) return;
        const policy = releasePolicy(await response.json(), Platform.OS);
        const notice = updateAvailable(
          Application.nativeApplicationVersion ||
            Constants.expoConfig?.version ||
            "0.1.0",
          Application.nativeBuildVersion || "1",
          policy,
        );
        if (!notice) return;
        const until = Number(
          await AsyncStorage.getItem(
            "thinkedu.update." +
              notice.latestVersion +
              "." +
              notice.latestBuild,
          ),
        );
        if (alive && (notice.required || Date.now() > until)) setUpdate(notice);
      } catch {
        /* A rede não impede o acesso à escola. */
      } finally {
        clearTimeout(timer);
      }
    }
    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  async function later() {
    if (!update || update.required) return;
    await AsyncStorage.setItem(
      "thinkedu.update." + update.latestVersion + "." + update.latestBuild,
      String(Date.now() + 86400000),
    );
    setUpdate(null);
  }
  return (
    <Modal
      transparent
      visible={!!update}
      animationType="fade"
      onRequestClose={() => void later()}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.eyebrow}>THINKEDU · UMA NOVA VERSÃO</Text>
          <Text style={s.title}>
            {update?.required
              ? "Vamos atualizar para continuar?"
              : "O thinkEdu ficou ainda melhor."}
          </Text>
          <Text style={s.copy}>
            {update?.releaseNotes ||
              "Uma atualização está disponível para você na loja."}
          </Text>
          <Text style={s.version}>Versão {update?.latestVersion}</Text>
          {!!error && <Text style={s.copy}>{error}</Text>}
          <Pressable
            accessibilityRole="button"
            style={s.button}
            onPress={() => {
              if (update)
                void Linking.openURL(update.storeUrl).catch(() =>
                  setError("Não foi possível abrir a loja. Tente novamente."),
                );
            }}
          >
            <Text style={s.buttonText}>Atualizar na loja</Text>
          </Pressable>
          {!update?.required && (
            <Pressable
              accessibilityRole="button"
              style={s.later}
              onPress={() => void later()}
            >
              <Text style={s.copy}>Mais tarde</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#14203D88",
    padding: 26,
  },
  card: { backgroundColor: "white", borderRadius: 28, padding: 28 },
  eyebrow: {
    fontSize: 10,
    color: "#254BFF",
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    color: "#14203D",
    fontWeight: "800",
    marginVertical: 18,
  },
  copy: { fontSize: 14, lineHeight: 23, color: "#62708A" },
  version: { fontSize: 12, color: "#62708A", marginVertical: 18 },
  button: {
    backgroundColor: "#254BFF",
    borderRadius: 15,
    padding: 17,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 14, fontWeight: "700" },
  later: { alignItems: "center", padding: 16 },
});
