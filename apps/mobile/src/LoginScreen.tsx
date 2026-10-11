import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { StatusBar } from "expo-status-bar";
import Feather from "@expo/vector-icons/Feather";
import type { Actor } from "./session";
export type LoginSession = { token: string; actor: Actor };
const api = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
export function LoginScreen({
  onLogin,
  onPreview,
}: {
  onLogin: (session: LoginSession) => void;
  onPreview?: () => void;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [help, setHelp] = useState(false);
  async function login() {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail válido para continuar.");
      return;
    }
    if (!password) {
      setError("Informe sua senha.");
      return;
    }
    if (!api) {
      setError(
        "Sua escola ainda não ativou o acesso. Entre em contato com a secretaria.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(api + "/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ThinkEdu-Client": "app",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          result.error || "Não foi possível entrar. Tente novamente.",
        );
      if (!result.token || !result.actor)
        throw Error("Não foi possível validar seu acesso.");
      setPassword("");
      onLogin(result);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Não conseguimos conectar. Confira sua internet e tente novamente."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.stage}>
      <StatusBar style="light" />
      <View style={s.shell}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={s.hero}>
              <SafeAreaView edges={["top"]}>
                <View style={s.brand}>
                  <Image
                    source={require("../assets/thinkedu-symbol-light.png")}
                    style={s.logo}
                  />
                  <Text style={s.wordmark}>
                    think<Text style={{ color: "#dce9a4" }}>Edu</Text>
                  </Text>
                </View>
                <View style={s.overline}>
                  <View style={s.dot} />
                  <Text style={s.eyebrow}>ESCOLA E FAMÍLIA, MAIS PERTO.</Text>
                </View>
                <Text style={s.headline}>
                  Pequenos dias.{"\n"}
                  <Text style={{ color: "#dce9a4" }}>
                    Grandes{"\n"}descobertas.
                  </Text>
                </Text>
                <Text style={s.intro}>
                  Um lugar para acompanhar,{"\n"}compartilhar e crescer junto.
                </Text>
                <View
                  style={s.art}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <View style={s.orbit} />
                  <View style={s.bookLeft} />
                  <View style={s.bookRight} />
                  <View style={s.sun} />
                  <View style={s.smallDot} />
                </View>
              </SafeAreaView>
            </View>
            <SafeAreaView style={s.form} edges={["bottom"]}>
              <View style={s.welcome}>
                <Text style={s.title}>Que bom ter você aqui.</Text>
                <Text style={s.subtitle}>
                  Entre para acompanhar o que importa.
                </Text>
              </View>
              <Text style={s.label}>Seu e-mail</Text>
              <View style={s.field}>
                <Feather name="mail" size={18} color="#858a9b" />
                <TextInput
                  style={s.input}
                  accessibilityLabel="Seu e-mail"
                  placeholder="voce@exemplo.com"
                  placeholderTextColor="#979ba9"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="username"
                  editable={!busy}
                />
              </View>
              <View style={s.passwordLabel}>
                <Text style={s.label}>Sua senha</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setHelp(!help)}
                  hitSlop={8}
                >
                  <Text style={s.forgot}>Esqueci minha senha</Text>
                </Pressable>
              </View>
              <View style={s.field}>
                <Feather name="lock" size={18} color="#858a9b" />
                <TextInput
                  style={s.input}
                  accessibilityLabel="Sua senha"
                  placeholder="Digite sua senha"
                  placeholderTextColor="#979ba9"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  editable={!busy}
                  returnKeyType="go"
                  onSubmitEditing={login}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    visible ? "Ocultar senha" : "Mostrar senha"
                  }
                  onPress={() => setVisible(!visible)}
                  hitSlop={12}
                >
                  <Feather
                    name={visible ? "eye-off" : "eye"}
                    size={19}
                    color="#858a9b"
                  />
                </Pressable>
              </View>
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              {help && (
                <View style={s.help}>
                  <Text style={s.helpTitle}>Vamos ajudar você a entrar.</Text>
                  <Text style={s.helpText}>
                    Peça à secretaria da sua escola a recuperação do acesso. O
                    envio de links por e-mail ainda precisa ser ativado pela
                    escola.
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Entrar no thinkEdu"
                disabled={busy}
                onPress={login}
                style={({ pressed }) => [
                  s.enter,
                  { opacity: busy ? 0.7 : pressed ? 0.85 : 1 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={s.enterText}>Entrar no thinkEdu</Text>
                    <Feather name="arrow-right" size={21} color="white" />
                  </>
                )}
              </Pressable>
              <View style={s.invite}>
                <Text style={s.inviteText}>Primeiro acesso?</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setHelp(!help)}
                >
                  <Text style={s.inviteLink}>
                    Fale com sua escola <Text>↗</Text>
                  </Text>
                </Pressable>
              </View>
              <View style={s.footer}>
                <Image
                  source={require("../assets/thinkedu-symbol.png")}
                  style={s.footerLogo}
                />
                <Text style={s.footerText}>THINKSYSTEMS · EDUCAÇÃO</Text>
              </View>
              {onPreview && (
                <Pressable
                  accessibilityRole="button"
                  onPress={onPreview}
                  style={{ alignSelf: "center", padding: 12 }}
                >
                  <Text style={s.preview}>Explorar demonstração</Text>
                </Pressable>
              )}
            </SafeAreaView>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  stage: { flex: 1, backgroundColor: "#eceee9", alignItems: "center" },
  shell: { flex: 1, width: "100%", maxWidth: 480, backgroundColor: "#fffdf7" },
  hero: {
    backgroundColor: "#172d65",
    paddingHorizontal: 28,
    paddingBottom: 30,
    overflow: "hidden",
    borderBottomRightRadius: 64,
    minHeight: 345,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  logo: { width: 33, height: 38, resizeMode: "contain" },
  wordmark: {
    fontFamily: "JakartaExtraBold",
    fontSize: 30,
    color: "white",
    letterSpacing: -1.5,
  },
  overline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 32,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#f6a87a" },
  eyebrow: {
    fontFamily: "JakartaBold",
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#c4d0eb",
  },
  headline: {
    fontFamily: "JakartaExtraBold",
    fontSize: 39,
    lineHeight: 44,
    letterSpacing: -1.8,
    color: "white",
    marginTop: 15,
  },
  intro: {
    fontFamily: "JakartaRegular",
    fontSize: 12,
    lineHeight: 19,
    color: "#c4d0eb",
    marginTop: 14,
  },
  art: {
    position: "absolute",
    width: 145,
    height: 150,
    right: -31,
    bottom: -16,
    transform: [{ rotate: "-12deg" }],
  },
  orbit: {
    position: "absolute",
    width: 158,
    height: 158,
    borderRadius: 79,
    borderWidth: 1,
    borderColor: "#6079ad",
    left: -8,
    top: 5,
  },
  bookLeft: {
    position: "absolute",
    width: 48,
    height: 64,
    borderTopLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "#a8bafb",
    left: 26,
    top: 64,
    transform: [{ skewY: "15deg" }],
  },
  bookRight: {
    position: "absolute",
    width: 48,
    height: 64,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    backgroundColor: "#dce9a4",
    left: 80,
    top: 64,
    transform: [{ skewY: "-15deg" }],
  },
  sun: {
    position: "absolute",
    width: 25,
    height: 25,
    borderRadius: 20,
    backgroundColor: "#f6a87a",
    left: 65,
    top: 29,
  },
  smallDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f6a87a",
    left: 8,
    top: 85,
  },
  form: { paddingHorizontal: 28, paddingTop: 28, flex: 1 },
  welcome: { marginBottom: 25 },
  title: {
    fontFamily: "JakartaExtraBold",
    fontSize: 23,
    letterSpacing: -0.8,
    color: "#202b43",
  },
  subtitle: {
    fontFamily: "JakartaRegular",
    fontSize: 12,
    color: "#7b8090",
    marginTop: 7,
  },
  label: {
    fontFamily: "JakartaBold",
    fontSize: 11,
    color: "#424b60",
    marginBottom: 8,
  },
  field: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#e3e3df",
    borderRadius: 15,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontFamily: "JakartaRegular",
    fontSize: 13,
    color: "#202b43",
    paddingVertical: 16,
    minWidth: 0,
  },
  passwordLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  forgot: {
    fontFamily: "JakartaBold",
    fontSize: 10,
    color: "#3d54ad",
    marginBottom: 8,
  },
  enter: {
    minHeight: 55,
    borderRadius: 16,
    backgroundColor: "#304bff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    marginTop: 24,
  },
  enterText: { fontFamily: "JakartaBold", fontSize: 14, color: "white" },
  invite: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 20,
  },
  inviteText: { fontFamily: "JakartaRegular", fontSize: 11, color: "#7b8090" },
  inviteLink: { fontFamily: "JakartaBold", fontSize: 11, color: "#3d54ad" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
    marginBottom: 18,
  },
  footerLogo: { width: 17, height: 19, resizeMode: "contain" },
  footerText: {
    fontFamily: "JakartaBold",
    fontSize: 8,
    letterSpacing: 1.1,
    color: "#979ba9",
  },
  error: {
    fontFamily: "JakartaRegular",
    fontSize: 12,
    lineHeight: 18,
    color: "#b53a39",
    marginTop: 12,
  },
  help: {
    padding: 15,
    backgroundColor: "#edf0fb",
    borderRadius: 12,
    marginTop: 12,
  },
  helpTitle: { fontFamily: "JakartaBold", fontSize: 12, color: "#304580" },
  helpText: {
    fontFamily: "JakartaRegular",
    fontSize: 11,
    lineHeight: 18,
    color: "#687390",
    marginTop: 5,
  },
  preview: { fontFamily: "JakartaRegular", fontSize: 10, color: "#9398a5" },
});
