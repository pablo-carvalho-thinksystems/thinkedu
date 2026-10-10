import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createSeed,
  visibleState,
  applyCommand,
} from "../../../packages/core/model.mjs";

export type Store = ReturnType<typeof createSeed>;
export type Actor = Store["actors"][number];
export type Child = Store["children"][number];
export type Command = Record<string, unknown> & { type: string };
const KEY = "thinkedu.demo.v1";
const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export function useSchool() {
  const [store, setStore] = useState<Store>(createSeed);
  const [actorId, setActorId] = useState("rafael");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const token = useRef("");
  const locking = useRef(false);
  const actor = createSeed().actors.find((a) => a.id === actorId)!;
  async function request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token.current ? { Authorization: `Bearer ${token.current}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Não foi possível concluir.");
    return data;
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (base) {
          const session = await request("/demo/session", "POST", { actorId });
          if (!active) return;
          token.current = session.token;
          const data = await request("/state");
          if (active) setStore(data);
        } else {
          const saved = await AsyncStorage.getItem(KEY);
          if (saved && active) {
            const data = JSON.parse(saved);
            if (
              data.version === 1 &&
              Array.isArray(data.children) &&
              Array.isArray(data.actors)
            )
              setStore(data);
          }
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Falha ao abrir a demonstração.",
          );
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [actorId]);
  async function dispatch(command: Command) {
    if (locking.current) return false;
    locking.current = true;
    setBusy(true);
    setError("");
    try {
      const next = base
        ? await request("/commands", "POST", command)
        : applyCommand(store, actor, command, "2026-10-09T15:00:00-03:00");
      if (!base) await AsyncStorage.setItem(KEY, JSON.stringify(next));
      setStore(next);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    } finally {
      locking.current = false;
      setBusy(false);
    }
  }
  function switchRole(id: string) {
    if (id === actorId || locking.current) return;
    setReady(false);
    setActorId(id);
  }
  return {
    data: base ? store : visibleState(store, actor),
    actor,
    ready,
    busy,
    error,
    clearError: () => setError(""),
    dispatch,
    switchRole,
    connected: !!base,
  };
}
