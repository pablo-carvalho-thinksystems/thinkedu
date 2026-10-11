import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import {
  createSeed,
  upgradeStore,
  visibleState,
  applyCommand,
  type VisibleStore,
} from "../../../packages/core/model.mjs";
import { effectiveActor } from "../../../packages/core/permissions.mjs";
import { filterAudit } from "../../../packages/core/audit.mjs";
import { can } from "../../../packages/core/permissions.mjs";
export type Store = ReturnType<typeof createSeed>;
export type Actor = Store["actors"][number];
export type Child = Store["children"][number];
export type Command = Record<string, unknown> & { type: string };
const KEY = "thinkedu.demo.v1",
  base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
function emptyState(actor: Actor): VisibleStore {
  const state = createSeed();
  for (const key of [
    "children",
    "routines",
    "attendance",
    "activities",
    "notices",
    "messages",
    "invoices",
    "events",
    "posts",
    "audit",
  ] as const)
    (state[key] as unknown[]) = [];
  state.actors = [actor];
  return visibleState(state, actor);
}
export function useSchool(authSession?: { token: string; actor: Actor }) {
  const [store, setStore] = useState<Store>(createSeed),
    [remote, setRemote] = useState<VisibleStore | null>(null),
    [actorId, setActorId] = useState(authSession?.actor.id || "rafael"),
    [sessionActor, setSessionActor] = useState<Actor>(
      authSession?.actor || createSeed().actors[0],
    ),
    [profiles, setProfiles] = useState<Actor[]>(createSeed().actors),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const token = useRef(""),
    locking = useRef(false);
  const actor = base
    ? remote?.currentActor || sessionActor
    : effectiveActor(
        store,
        store.actors.find((a) => a.id === actorId) || sessionActor,
      );
  async function request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-ThinkEdu-Client": "app",
        ...(token.current ? { Authorization: "Bearer " + token.current } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) {
      const e = Error(data.error || "Não foi possível concluir.") as Error & {
        status: number;
      };
      e.status = response.status;
      throw e;
    }
    return data;
  }
  useEffect(() => {
    let active = true;
    token.current = "";
    setReady(false);
    setRemote(null);
    setError("");
    (async () => {
      try {
        if (base) {
          const session =
            authSession ||
            (await request("/demo/session", "POST", { actorId }));
          if (!authSession) {
            const ps = await request("/demo/profiles");
            if (active) setProfiles(ps);
          }
          if (!active) return;
          token.current = session.token;
          setSessionActor(session.actor);
          const data = await request("/state");
          if (active) {
            setRemote(data);
            setReady(true);
          }
        } else {
          const saved = await AsyncStorage.getItem(KEY);
          if (saved && active) {
            const data = JSON.parse(saved);
            if (
              data.version === 1 &&
              Array.isArray(data.children) &&
              Array.isArray(data.actors)
            )
              setStore(upgradeStore(data));
          }
          if (active) setReady(true);
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setReady(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [actorId]);
  useEffect(() => {
    if (!base || !ready) return;
    let active = true;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void request("/state")
          .then((data) => {
            if (active) setRemote(data);
          })
          .catch((e) => {
            if (active) {
              setRemote(null);
              setReady(false);
              setError(e.message);
            }
          });
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [actorId, ready]);
  async function dispatch(command: Command) {
    if (locking.current || !ready) return false;
    locking.current = true;
    setBusy(true);
    setError("");
    try {
      const next = base
        ? await request("/commands", "POST", command)
        : applyCommand(store, actor, command, undefined, undefined, {
            allowLocalMedia: true,
          });
      if (base) setRemote(next);
      else {
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        setStore(next);
      }
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      locking.current = false;
      setBusy(false);
    }
  }
  async function refreshProfiles() {
    if (!base) return;
    try {
      setProfiles(await request("/demo/profiles"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function switchRole(id: string) {
    if (authSession) return false;
    if (id === actorId) return true;
    if (locking.current) return false;
    const next = (base ? profiles : store.actors).find(
      (a) => a.id === id && a.active !== false,
    );
    if (!next) return false;
    if (base && token.current) {
      try {
        await request("/session/logout", "POST", {});
      } catch (e) {
        if ((e as Error & { status?: number }).status !== 401) {
          setError((e as Error).message);
          return false;
        }
      }
    }
    setSessionActor({
      ...next,
      childIds: next.childIds || [],
      classIds: next.classIds || [],
      schoolId: next.schoolId || store.school.id,
      financial: next.financial || false,
    });
    setReady(false);
    setActorId(id);
    return true;
  }
  async function loadAudit(filters: Record<string, string>, page = 1) {
    if (!can(actor, "audit.read"))
      throw Error("Seu perfil não tem acesso à auditoria.");
    if (base)
      return request(
        "/audit?" +
          new URLSearchParams({ ...filters, page: String(page), limit: "25" }),
      );
    const list = filterAudit(store.audit, filters);
    return {
      entries: list.slice((page - 1) * 25, page * 25),
      total: list.length,
    };
  }
  return {
    logout: async () => {
      if (base && token.current) await request("/session/logout", "POST", {});
      token.current = "";
      setRemote(null);
      setReady(false);
    },
    loadAudit,
    data: base
      ? remote || emptyState(sessionActor)
      : visibleState(store, actor),
    actor,
    profiles: (base ? profiles : store.actors).filter(
      (a) => a.active !== false,
    ),
    ready: ready && actor.active !== false,
    busy,
    error,
    clearError: () => setError(""),
    dispatch,
    switchRole,
    refreshProfiles,
    connected: !!base,
  };
}
