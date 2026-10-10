import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  applyCommand,
  createSeed,
  upgradeStore,
  visibleState,
  money,
  DEMO_DATE,
  calendarCells,
  type Store,
  type VisibleStore,
  type Child,
  type Actor,
} from "../../../packages/core/model.mjs";
import {
  can,
  roleLabels,
  staffRoles,
  rolePermissions,
  effectiveActor,
} from "../../../packages/core/permissions.mjs";
import { consolidateInvoices } from "../../../packages/core/billing.mjs";
import lia from "../../mobile/assets/lia-avatar.png";
import bento from "../../mobile/assets/bento-avatar.png";
import "./style.css";
import { AuditWorkspace } from "./AuditWorkspace";
import { filterUnitView } from "../../../packages/core/units.mjs";
const seed = createSeed(),
  key = "thinkedu.admin.v1";
const api = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const pages = [
  "Visão geral",
  "Turmas e alunos",
  "Presença e rotinas",
  "Comunicação",
  "Calendário",
  "Financeiro",
  "Configurações",
  "Usuários e acessos",
  "Unidades",
  "Auditoria",
];
const pagePermissions = [
  "routines.read",
  "students.read",
  "routines.read",
  "communication.read",
  "calendar.read",
  "finance.read",
  "users.manage",
  "users.manage",
  "units.manage",
  "audit.read",
];
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    home: "M3 10l9-7 9 7v10H3z M9 20v-7h6v7",
    people:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4",
    check: "M9 11l3 3 8-8 M20 12v8H4V4h12",
    message: "M21 3H3v14h5v4l5-4h8z M7 7h10 M7 11h6",
    calendar: "M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16",
    money: "M3 5h18v14H3z M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M6 12h0 M18 12h0",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
    plus: "M12 5v14 M5 12h14",
    close: "M6 6l12 12 M6 18L18 6",
    file: "M6 2h8l4 4v16H6z M14 2v5h5 M9 12h6 M9 16h6",
    flower:
      "M12 12C0 12 0 0 12 0c0 12 12 12 12 0 12 0 12 12 0 12 12 0 12 12 0 12 0-12-12-12-12 0-12 0-12-12 0-12",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.home} />
    </svg>
  );
}
function Face({ child }: { child: Child }) {
  return child.id === "lia" || child.id === "bento" ? (
    <img
      className="face"
      src={child.id === "lia" ? lia : bento}
      alt={child.name}
    />
  ) : (
    <span className={`face initials ${child.tone}`}>{child.initials}</span>
  );
}
const dateLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
function Pagination({
  total,
  page,
  setPage,
  size = 16,
}: {
  total: number;
  page: number;
  setPage: (page: number) => void;
  size?: number;
}) {
  const count = Math.max(1, Math.ceil(total / size));
  if (count < 2) return null;
  return (
    <div className="pagination">
      <span>
        {total} registros · Página {page + 1} de {count}
      </span>
      <button
        className="secondary"
        disabled={!page}
        onClick={() => setPage(page - 1)}
      >
        Anterior
      </button>
      <button
        className="secondary"
        disabled={page + 1 >= count}
        onClick={() => setPage(page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}
function App() {
  const [actorId, setActorId] = useState("direcao"),
    [sessionActor, setSessionActor] = useState<Actor>(
      seed.actors.find((a) => a.id === "direcao")!,
    ),
    [profiles, setProfiles] = useState(
      seed.actors.filter((a) => a.role !== "family"),
    );
  const [data, setData] = useState<Store | VisibleStore>(() => {
    if (api) {
      const blank = createSeed();
      for (const k of [
        "children",
        "actors",
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
        (blank[k] as unknown[]) = [];
      return blank;
    }
    try {
      return upgradeStore(
        JSON.parse(localStorage.getItem(key) || "null") || createSeed(),
      );
    } catch {
      return createSeed();
    }
  });
  const actor = api
    ? (data as VisibleStore).currentActor || sessionActor
    : effectiveActor(
        data as Store,
        (data as Store).actors.find((a) => a.id === actorId) || sessionActor,
      );
  const allowedPages = pages.filter((_, i) => can(actor, pagePermissions[i]));
  useEffect(() => {
    if (!allowedPages.includes(pageRef.current))
      setPage(
        can(actor, "finance.read") && !can(actor, "routines.read")
          ? "Financeiro"
          : allowedPages[0] || pages[0],
      );
  }, [actorId, actor.role, actor.active, actor.auditAccess]);
  const pageRef = useRef(pages[0]);
  const [page, setPage] = useState(pages[0]),
    [search, setSearch] = useState(""),
    [classId, setClass] = useState("all"),
    [unitId, setUnit] = useState("all"),
    [listPage, setListPage] = useState(0),
    [date, setDate] = useState(DEMO_DATE),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState<Child | null>(null),
    [channel, setChannel] = useState("Comunicados"),
    [month, setMonth] = useState("2026-10"),
    [eventDay, setEventDay] = useState(""),
    [form, setForm] = useState<Record<string, string>>({}),
    [targets, setTargets] = useState("all");
  pageRef.current = page;
  const lock = useRef(false),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!api) return;
    let active = true;
    setConnected(false);
    (async () => {
      try {
        const r = await fetch(api + "/demo/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ThinkEdu-Client": "web",
          },
          body: JSON.stringify({ actorId }),
        });
        if (!r.ok) throw Error("Não foi possível iniciar a sessão.");
        const session = await r.json();
        const ps = await fetch(api + "/demo/profiles", {
          headers: { "X-ThinkEdu-Client": "web" },
        });
        if (active && ps.ok)
          setProfiles(
            (await ps.json()).filter((a: Actor) => a.role !== "family"),
          );
        if (active) setSessionActor(session.actor);
        const s = await fetch(api + "/state", {
          headers: {
            Authorization: "Bearer " + session.token,
            "X-ThinkEdu-Client": "web",
          },
        });
        if (!s.ok) throw Error("Não foi possível carregar a escola.");
        const next = await s.json();
        if (active) {
          setToken(session.token);
          setData(next);
          setConnected(true);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [actorId]);
  useEffect(() => {
    if (!api || !token) return;
    let active = true;
    const refresh = () => {
      void fetch(api + "/state", {
        headers: {
          Authorization: "Bearer " + token,
          "X-ThinkEdu-Client": "web",
        },
      })
        .then(async (r) => {
          if (!active) return;
          if (r.status === 401) {
            setConnected(false);
            const blank = createSeed();
            for (const k of [
              "children",
              "actors",
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
              (blank[k] as unknown[]) = [];
            setData({
              ...blank,
              currentActor: { ...sessionActor, active: false },
            });
            setError("Seu acesso foi desativado ou a sessão expirou.");
            return;
          }
          if (r.ok) setData(await r.json());
        })
        .catch(() => {});
    };
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [token, actorId]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  const authorized: VisibleStore = api
    ? (data as VisibleStore)
    : visibleState(data as Store, actor);
  const shown = filterUnitView(authorized, unitId);
  useEffect(() => {
    setListPage(0);
  }, [unitId, classId, search, page, channel, actorId]);
  useEffect(() => {
    if (unitId !== "all" && !authorized.units.some((u) => u.id === unitId))
      setUnit("all");
  }, [actorId, authorized.units]);
  const currentProfiles = api
    ? profiles
    : (data as Store).actors.filter(
        (a) => a.role !== "family" && a.active !== false,
      );
  async function switchProfile(id: string) {
    if (busy) return;
    const next = currentProfiles.find((a) => a.id === id);
    if (!next) return;
    if (api && token) {
      try {
        const ended = await fetch(api + "/session/logout", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "X-ThinkEdu-Client": "web",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        if (!ended.ok && ended.status !== 401)
          throw Error("Sessão não encerrada.");
      } catch {
        setError("Não foi possível encerrar a sessão. Tente novamente.");
        return;
      }
    }
    setUnit("all");
    setClass("all");
    setActorId(id);
    setSessionActor(next as Actor);
    setModal("");
    setError("");
    setConnected(false);
    setToken("");
    setPage(
      can(next, "finance.read") && !can(next, "routines.read")
        ? pages[5]
        : pages[0],
    );
    if (api) {
      const blank = createSeed();
      for (const field of [
        "children",
        "actors",
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
        (blank[field] as unknown[]) = [];
      setData({ ...blank, currentActor: next as Actor });
    }
  }
  const classes: [string, string][] = shown.classes.map((g) => [
    g.id,
    `${g.name} · ${shown.units.find((u) => u.id === g.unitId)?.name || ""}`,
  ]);
  const slicePage = <T,>(items: T[], size = 16) =>
    items.slice(listPage * size, (listPage + 1) * size);
  const families = shown.actors.filter((a) => a.role === "family");
  const children = shown.children.filter(
    (c) =>
      (classId === "all" || c.classId === classId) &&
      `${c.name} ${c.group}`.toLowerCase().includes(search.toLowerCase()),
  );
  const attendance = shown.attendance.filter((a) => a.date === date),
    routines = shown.routines.filter((r) => r.date === date);
  const present = children.filter((c) =>
    attendance.some((a) => a.childId === c.id && a.status === "present"),
  ).length;
  const published = children.filter((c) =>
    routines.some((r) => r.childId === c.id && r.published),
  ).length;
  const pending = children.filter(
    (c) =>
      !attendance.some((a) => a.childId === c.id && a.status === "absent") &&
      !routines.some((r) => r.childId === c.id && r.published),
  );
  const open = shown.invoices
    .filter((i) => i.status === "open")
    .reduce((s, i) => s + i.amount, 0);
  const paid = shown.invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);
  const go = (p: string) => {
    window.scrollTo({ top: 0 });
    setPage(p);
    setSearch("");
    setClass("all");
    setError("");
  };
  const openModal = (kind: string, c?: Child) => {
    setSelected(c || null);
    setError("");
    setTargets(c ? "child:" + c.id : classId);
    setForm({
      date,
      time: "09:00",
      kind: "update",
      role: c ? "teacher" : "coordinator",
      active: "true",
      units: actor.unitIds?.join(",") || "all",
      capacity: "16",
      unitId: unitId === "all" ? shown.units[0]?.id || "" : unitId,
      status: "present",
      arrival: "08:00",
      departure: "17:00",
      ...(c
        ? {
            arrival:
              attendance.find((a) => a.childId === c.id)?.arrival || "08:00",
            status:
              attendance.find((a) => a.childId === c.id)?.status || "present",
          }
        : {}),
    });
    setModal(kind);
  };
  async function dispatch(command: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let next;
      if (api) {
        if (!connected)
          throw Error("A conexão com a escola ainda não está disponível.");
        const r = await fetch(api + "/commands", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
            "X-ThinkEdu-Client": "web",
          },
          body: JSON.stringify(command),
        });
        next = await r.json();
        if (!r.ok) throw Error(next.error || "Não foi possível salvar.");
      } else {
        next = applyCommand(data as Store, actor, command);
        localStorage.setItem(key, JSON.stringify(next));
      }
      setData(next);
      if (api)
        void fetch(api + "/demo/profiles")
          .then((r) => (r.ok ? r.json() : null))
          .then((ps) => {
            if (ps) setProfiles(ps.filter((a: Actor) => a.role !== "family"));
          })
          .catch(() => {});
      setModal("");
      setToast("Salvo. As informações foram atualizadas.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const targetIds = shown.children
    .filter(
      (c) =>
        targets === "all" ||
        targets === c.classId ||
        targets === "child:" + c.id,
    )
    .map((c) => c.id);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const common = { title: form.title, childIds: targetIds };
    if (modal === "user")
      void dispatch({
        type: form.userId ? "user.update" : "user.create",
        userId: form.userId,
        name: form.name,
        role: form.role,
        active: form.active === "true",
        classIds: (form.classes || "").split(",").filter(Boolean),
        unitIds:
          form.units === "all"
            ? null
            : (form.units || "").split(",").filter(Boolean),
      });
    if (modal === "unit")
      void dispatch({
        type: form.unitIdToEdit ? "unit.update" : "unit.create",
        unitId: form.unitIdToEdit,
        name: form.name,
        address: {
          street: form.street,
          number: form.number,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
        },
      });
    if (modal === "class")
      void dispatch({
        type: "class.create",
        name: form.name,
        unitId: form.unitId,
        capacity: Number(form.capacity),
      });
    if (modal === "enroll")
      void dispatch({
        type: "student.create",
        name: form.name,
        classId: form.classId,
        guardianId: form.guardianId,
        guardianName: form.guardianName,
      });
    if (modal === "notice")
      void dispatch({
        type: "notice.create",
        ...common,
        body: form.body,
        kind: form.kind,
        due: form.kind === "update" ? null : form.due,
      });
    if (modal === "event")
      void dispatch({
        type: "event.create",
        ...common,
        date: form.date,
        time: form.time,
        place: form.place,
      });
    if (modal === "post")
      void dispatch({
        type: "mural.create",
        ...common,
        body: form.body,
        kind: form.kind === "update" ? "text" : form.kind,
        attachment:
          form.kind === "update"
            ? null
            : {
                uri: form.url,
                name: form.filename || form.title,
                mimeType:
                  form.kind === "video" ? "video/mp4" : "application/pdf",
              },
      });
    if (modal === "attendance")
      void dispatch({
        type: "attendance.save",
        childId: selected?.id,
        date: form.date,
        status: form.status,
        arrival: form.arrival,
        departure: form.departure,
        note: form.body || "",
      });
    if (modal === "message")
      void dispatch({
        type: "message.send",
        childId: selected?.id,
        body: form.body,
      });
  }
  const field = (
    name: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        value={form[name] || ""}
        maxLength={name === "title" ? 150 : 2000}
        onInput={(e) => {
          const value = e.currentTarget.value;
          setForm((f) => ({ ...f, [name]: value }));
        }}
      />
    </label>
  );
  const status = (c: Child) => {
    const a = attendance.find((a) => a.childId === c.id);
    return (
      <span
        className={
          "badge " +
          (a?.status === "present"
            ? "green"
            : a?.status === "absent"
              ? "orange"
              : "")
        }
      >
        {a?.status === "present"
          ? "Na escola"
          : a?.status === "left"
            ? "Saída registrada"
            : a?.status === "absent"
              ? "Ausente"
              : "Sem chamada"}
      </span>
    );
  };
  const destinations = (
    <label>
      Destinatários
      <select value={targets} onChange={(e) => setTargets(e.target.value)}>
        <option value="all">
          {unitId === "all"
            ? "Todos os alunos autorizados"
            : "Toda a unidade selecionada"}
        </option>
        {classes.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
        {shown.children.map((c) => (
          <option key={c.id} value={"child:" + c.id}>
            {c.name} · {c.group}
          </option>
        ))}
      </select>
      <small>{targetIds.length} aluno(s) selecionado(s)</small>
    </label>
  );
  const row = (c: Child) => (
    <tr key={c.id}>
      <td>
        <button className="person" onClick={() => openModal("student", c)}>
          <Face child={c} />
          <span>
            <strong>{c.name}</strong>
            <small>{c.group}</small>
          </span>
        </button>
      </td>
      {can(actor, "attendance.read") && <td>{status(c)}</td>}
      {can(actor, "attendance.read") && (
        <td>{attendance.find((a) => a.childId === c.id)?.arrival || "—"}</td>
      )}
      {can(actor, "routines.read") && (
        <td>
          <span
            className={
              "badge " +
              (routines.some((r) => r.childId === c.id && r.published)
                ? "green"
                : "orange")
            }
          >
            {routines.some((r) => r.childId === c.id && r.published)
              ? "Publicada"
              : routines.some((r) => r.childId === c.id)
                ? "Rascunho"
                : "Pendente"}
          </span>
        </td>
      )}
      <td>
        <button
          className="iconButton"
          aria-label={"Ver " + c.name}
          onClick={() => openModal("student", c)}
        >
          <Icon name="arrow" />
        </button>
      </td>
    </tr>
  );
  return (
    <div className="layout">
      <aside className="sidebar">
        <button className="brand" onClick={() => go(pages[0])}>
          think<span>Edu</span>
          <img className="brandSymbol" src="/thinkedu-symbol.svg" alt="" />
        </button>
        <small className="brandSub">THINKSYSTEMS · EDUCAÇÃO</small>
        <div className="school">
          <span className="schoolMark">s.</span>
          <div>
            <strong>{shown.school.name}</strong>
            <small>Administração escolar</small>
          </div>
        </div>
        <small className="navLabel">SEU ESPAÇO DE GESTÃO</small>
        <nav>
          {pages.map(
            (p, i) =>
              can(actor, pagePermissions[i]) && (
                <button
                  key={p}
                  className={page === p ? "active" : ""}
                  onClick={() => go(p)}
                >
                  <Icon
                    name={
                      [
                        "home",
                        "people",
                        "check",
                        "message",
                        "calendar",
                        "money",
                        "settings",
                        "people",
                        "home",
                      ][i]
                    }
                  />
                  {p}
                  {page === p && <span className="navDot" />}
                </button>
              ),
          )}
        </nav>
        <div className="sidebarBottom">
          <div className="sidebarNote">
            <img className="decorSymbol" src="/thinkedu-symbol.svg" alt="" />
            <strong>
              Cuidar começa
              <br />
              com estar perto.
            </strong>
            <p>
              Cada detalhe do dia,
              <br />
              no mesmo lugar.
            </p>
          </div>
          <a href="http://localhost:4341" target="_blank" rel="noreferrer">
            Abrir aplicativo <Icon name="arrow" size={16} />
          </a>
          <div className="account">
            <span className="adminAvatar">DS</span>
            <div>
              <strong>{actor.name}</strong>
              <small>{roleLabels[actor.role] || "Sem acesso"}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>
            Gestão escolar <b>/</b> {page}
          </span>
          <label className="unitFilter">
            Unidade
            <select
              aria-label="Filtrar unidade"
              value={unitId}
              onChange={(e) => {
                setUnit(e.target.value);
                setClass("all");
                setSearch("");
              }}
            >
              <option value="all">Todas as unidades autorizadas</option>
              {authorized.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="demoProfile">
            Perfil de demonstração
            <select
              aria-label="Perfil de acesso"
              value={actorId}
              disabled={busy}
              onChange={(e) => switchProfile(e.target.value)}
            >
              {currentProfiles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name.includes(roleLabels[a.role])
                    ? a.name
                    : `${a.name} · ${roleLabels[a.role]}`}
                </option>
              ))}
            </select>
          </label>
          <span className="mode">
            <i />
            {api
              ? connected
                ? "API conectada"
                : "Conectando…"
              : "Demonstração local"}
          </span>
        </div>
        <main>
          <header>
            <div>
              <span className="eyebrow">ESCOLA SEMENTE · ANO LETIVO 2026</span>
              <h1>{page === pages[0] ? "Um bom dia começa aqui." : page}</h1>
              <p>
                {
                  [
                    "Acompanhe sua escola. Cuide do que importa.",
                    "Cada criança, sua turma e suas pessoas.",
                    "O cuidado de hoje, registro por registro.",
                    "Uma escola presente na vida das famílias.",
                    "Encontros e descobertas, com o destino certo.",
                    "Mais clareza para a escola. Mais facilidade para as famílias.",
                    "As informações e a evolução do thinkEdu.",
                    "As pessoas certas, com o acesso certo.",
                    "Uma escola, vários endereços. Cada unidade com seu espaço.",
                    "Quem fez, quando e o que mudou. Tudo em um histórico.",
                  ][pages.indexOf(page)]
                }
              </p>
            </div>
            {page !== pages[9] &&
              can(
                actor,
                page === pages[8]
                  ? "units.manage"
                  : page === pages[7]
                    ? "users.manage"
                    : page === pages[1]
                      ? "students.write"
                      : page === pages[4]
                        ? "calendar.write"
                        : page === pages[3] && channel === "Mural"
                          ? "mural.write"
                          : "communication.write",
              ) && (
                <button
                  className="primary"
                  onClick={() =>
                    openModal(
                      page === pages[8]
                        ? "unit"
                        : page === pages[7]
                          ? "user"
                          : page === pages[1]
                            ? "enroll"
                            : page === "Calendário"
                              ? "event"
                              : page === "Comunicação" && channel === "Mural"
                                ? "post"
                                : "notice",
                    )
                  }
                >
                  <Icon name="plus" />
                  {page === pages[8]
                    ? "Nova unidade"
                    : page === pages[7]
                      ? "Novo usuário"
                      : page === pages[1]
                        ? "Novo aluno"
                        : page === "Calendário"
                          ? "Novo evento"
                          : page === "Comunicação" && channel === "Mural"
                            ? "Nova publicação"
                            : "Novo comunicado"}
                </button>
              )}
          </header>
          {page === pages[9] && can(actor, "audit.read") && (
            <AuditWorkspace
              data={authorized}
              actor={actor}
              api={api}
              token={token}
              onCommand={dispatch}
            />
          )}

          {api && !connected ? (
            <p className="empty">Carregando seu acesso à escola…</p>
          ) : null}
          {error && !modal && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {(page === pages[0] || page === pages[1] || page === pages[2]) && (
            <div className="filters">
              <div className="filterGroup">
                <select
                  aria-label="Filtrar turma"
                  value={classId}
                  onChange={(e) => setClass(e.target.value)}
                >
                  <option value="all">Todas as turmas</option>
                  {classes.map(([id, n]) => (
                    <option key={id} value={id}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Data dos registros"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <span className="subtle">
                Dados fictícios · {dateLabel(date)}
              </span>
            </div>
          )}
          {page === pages[0] && can(actor, pagePermissions[0]) && (
            <>
              <div className="metrics">
                <article>
                  <span className="metricIcon sky">
                    <Icon name="people" />
                  </span>
                  <small>Alunos na escola</small>
                  <strong>
                    {present}
                    <em> / {children.length}</em>
                  </strong>
                  <span className="metricFoot">
                    {children.length -
                      attendance.filter((a) =>
                        children.some((c) => c.id === a.childId),
                      ).length}{" "}
                    chamada(s) a registrar
                  </span>
                </article>
                <article>
                  <span className="metricIcon lime">
                    <Icon name="check" />
                  </span>
                  <small>Rotinas publicadas</small>
                  <strong>
                    {published}
                    <em> / {children.length}</em>
                  </strong>
                  <span className="metricFoot">
                    {pending.length} aguardando publicação
                  </span>
                </article>
                {can(actor, "finance.read") && (
                  <article>
                    <span className="metricIcon peach">
                      <Icon name="money" />
                    </span>
                    <small>Valores em aberto</small>
                    <strong className="amount">{money(open)}</strong>
                    <span className="metricFoot">
                      Total de cobranças da escola
                    </span>
                  </article>
                )}
              </div>
              <div className="dashboardGrid">
                <section className="panel dayPanel">
                  <div className="sectionTitle">
                    <div>
                      <span className="eyebrow">ACOMPANHAMENTO</span>
                      <h2>O dia de cada criança</h2>
                    </div>
                    <button onClick={() => go(pages[2])}>
                      Ver rotinas <Icon name="arrow" size={16} />
                    </button>
                  </div>
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Aluno / turma</th>
                          {can(actor, "attendance.read") && <th>Presença</th>}
                          {can(actor, "attendance.read") && <th>Entrada</th>}
                          {can(actor, "routines.read") && <th>Rotina</th>}
                          <th />
                        </tr>
                      </thead>
                      <tbody>{slicePage(children).map(row)}</tbody>
                    </table>
                  </div>
                  <Pagination
                    total={children.length}
                    page={listPage}
                    setPage={setListPage}
                  />
                  {!children.length && (
                    <p className="empty">Nenhum aluno nesta seleção.</p>
                  )}
                  <div className="panelFoot">
                    <span className="dot orangeDot" />
                    {pending.length} rotina(s) aguardando a equipe
                  </div>
                </section>
                <section className="connectionCard">
                  <img
                    className="bigFlower decorSymbol"
                    src="/thinkedu-symbol.svg"
                    alt=""
                  />
                  <span className="eyebrow">ESCOLA + FAMÍLIA</span>
                  <h2>
                    Presença que
                    <br />
                    vai além
                    <br />
                    da sala.
                  </h2>
                  <p>
                    Uma novidade, uma descoberta,
                    <br />
                    um cuidado compartilhado.
                  </p>
                  <button onClick={() => openModal("post")}>
                    Publicar no mural <Icon name="arrow" size={18} />
                  </button>
                  <span className="cardFoot">
                    {shown.posts.length} histórias compartilhadas
                  </span>
                </section>
                <section className="panel">
                  <div className="sectionTitle">
                    <h2>No calendário</h2>
                    <button onClick={() => go(pages[4])}>
                      Ver tudo <Icon name="arrow" size={16} />
                    </button>
                  </div>
                  {[...shown.events]
                    .filter((e) => e.date >= date)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 3)
                    .map((e) => (
                      <div className="listRow" key={e.id}>
                        <span className="eventDate">
                          {e.date.slice(8)}
                          <small>
                            {new Date(e.date + "T12:00").toLocaleDateString(
                              "pt-BR",
                              { month: "short" },
                            )}
                          </small>
                        </span>
                        <div>
                          <strong>{e.title}</strong>
                          <small>
                            {e.time} · {e.place}
                          </small>
                        </div>
                        <Icon name="calendar" size={18} />
                      </div>
                    ))}
                </section>
                <section className="panel">
                  <div className="sectionTitle">
                    <h2>Para acompanhar</h2>
                    <span className="badge orange">
                      {pending.length} pendências
                    </span>
                  </div>
                  {pending.slice(0, 6).map((c) => (
                    <button
                      className="pendingRow"
                      key={c.id}
                      onClick={() => openModal("student", c)}
                    >
                      <Face child={c} />
                      <span>
                        <strong>{c.name}</strong>
                        <small>Rotina do dia · {c.group}</small>
                      </span>
                      <Icon name="arrow" size={18} />
                    </button>
                  ))}
                  {!pending.length && (
                    <p className="empty">Tudo em dia nesta seleção.</p>
                  )}
                </section>
              </div>
            </>
          )}
          {(page === pages[1] || page === pages[2]) &&
            can(actor, "students.read") && (
              <>
                {page === pages[1] && can(actor, pagePermissions[1]) && (
                  <div className="classCards">
                    {classes.map(([id, name]) => (
                      <button
                        className={
                          "classCard " + (classId === id ? "selected" : "")
                        }
                        key={id}
                        onClick={() => setClass(id)}
                      >
                        <img
                          className="classMotif decorSymbol"
                          src="/thinkedu-symbol.svg"
                          alt=""
                        />
                        <small>TURMA</small>
                        <h2>{name}</h2>
                        <p>
                          {
                            shown.children.filter((c) => c.classId === id)
                              .length
                          }{" "}
                          alunos ·{" "}
                          {shown.actors
                            .filter(
                              (a) =>
                                a.role === "teacher" &&
                                a.classIds?.includes(id),
                            )
                            .map((a) => a.name)
                            .join(", ") || "Equipe escolar"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <section className="panel">
                  <div className="sectionTitle">
                    <h2>
                      {page === pages[1]
                        ? "Alunos da escola"
                        : "Registros do dia"}
                    </h2>
                    <div className="search">
                      <Icon name="search" size={18} />
                      <input
                        aria-label="Buscar aluno"
                        placeholder="Buscar aluno ou turma"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Aluno / turma</th>
                          {can(actor, "attendance.read") && <th>Presença</th>}
                          {can(actor, "attendance.read") && <th>Entrada</th>}
                          {can(actor, "routines.read") && <th>Rotina</th>}
                          <th />
                        </tr>
                      </thead>
                      <tbody>{slicePage(children).map(row)}</tbody>
                    </table>
                  </div>
                  <Pagination
                    total={children.length}
                    page={listPage}
                    setPage={setListPage}
                  />
                  {!children.length && (
                    <p className="empty">Nenhum aluno encontrado.</p>
                  )}
                </section>
              </>
            )}
          {page === pages[3] && can(actor, pagePermissions[3]) && (
            <>
              <div className="tabs">
                {[
                  "Comunicados",
                  "Mural",
                  ...(can(actor, "messages.read") ? ["Conversas"] : []),
                ].map((t) => (
                  <button
                    className={channel === t ? "selected" : ""}
                    key={t}
                    onClick={() => setChannel(t)}
                  >
                    {t}
                    <span>
                      {t === "Mural"
                        ? shown.posts.length
                        : t === "Comunicados"
                          ? shown.notices.length
                          : shown.messages.length}
                    </span>
                  </button>
                ))}
              </div>
              {channel === "Comunicados" && (
                <div className="feed">
                  {slicePage(shown.notices).map((n) => (
                    <article className="panel" key={n.id}>
                      <div className="sectionTitle">
                        <span className="badge">
                          {n.type === "authorization"
                            ? "Autorização"
                            : n.type === "request"
                              ? "Solicitação"
                              : "Comunicado"}
                        </span>
                        <small>{dateLabel(n.createdAt.slice(0, 10))}</small>
                      </div>
                      <h2>{n.title}</h2>
                      <p className="bodyCopy">{n.body}</p>
                      <div className="postFoot">
                        <span>
                          Para{" "}
                          {n.childIds
                            .map(
                              (id) =>
                                shown.children.find((c) => c.id === id)?.name,
                            )
                            .join(", ")}
                        </span>
                        <span>
                          {n.readBy.length} leitura(s) · {n.responses.length}{" "}
                          resposta(s)
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {channel === "Mural" && (
                <div className="feed">
                  {slicePage(shown.posts).map((p) => (
                    <article className="panel" key={p.id}>
                      <div className="sectionTitle">
                        <span className="badge">
                          {p.kind === "video"
                            ? "Vídeo"
                            : p.kind === "file"
                              ? "Arquivo"
                              : "Recado"}
                        </span>
                        <small>{dateLabel(p.createdAt.slice(0, 10))}</small>
                      </div>
                      <h2>{p.title}</h2>
                      <p className="bodyCopy">{p.body}</p>
                      {p.attachment && (
                        <a
                          className="attachment"
                          href={
                            p.attachment.uri.startsWith("https://")
                              ? p.attachment.uri
                              : undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Icon name="file" />
                          {p.attachment.name}
                          {!p.attachment.uri.startsWith("https://") && (
                            <small>
                              Disponível no aplicativo demonstrativo
                            </small>
                          )}
                        </a>
                      )}
                      <div className="postFoot">
                        {p.childIds
                          .map(
                            (id) =>
                              shown.children.find((c) => c.id === id)?.name,
                          )
                          .join(", ")}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {channel === "Conversas" && (
                <section className="panel">
                  <h2>Conversas com responsáveis</h2>
                  {slicePage(
                    shown.children.filter(
                      (c) =>
                        !search ||
                        `${c.name} ${c.group}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    ),
                  ).map((c) => {
                    const m = shown.messages
                      .filter((m) => m.childId === c.id)
                      .at(-1);
                    return (
                      <button
                        className="pendingRow"
                        key={c.id}
                        onClick={() => openModal("message", c)}
                      >
                        <Face child={c} />
                        <span>
                          <strong>
                            {c.name} · {c.group}
                          </strong>
                          <small>
                            {m?.body || "Iniciar uma conversa com a família"}
                          </small>
                        </span>
                        <Icon name="arrow" />
                      </button>
                    );
                  })}
                </section>
              )}
            </>
          )}
          {page === pages[3] && (
            <Pagination
              total={
                channel === "Mural"
                  ? shown.posts.length
                  : channel === "Comunicados"
                    ? shown.notices.length
                    : shown.children.filter(
                        (c) =>
                          !search ||
                          `${c.name} ${c.group}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      ).length
              }
              page={listPage}
              setPage={setListPage}
            />
          )}
          {page === pages[4] && can(actor, pagePermissions[4]) && (
            <>
              <div className="filters">
                <input
                  aria-label="Mês do calendário"
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setEventDay("");
                  }}
                />
                <select
                  aria-label="Turma do calendário"
                  value={classId}
                  onChange={(e) => setClass(e.target.value)}
                >
                  <option value="all">Todas as turmas</option>
                  {classes.map(([id, n]) => (
                    <option key={id} value={id}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="calendarLayout">
                <section className="panel">
                  <h2>
                    {new Date(month + "-01T12:00").toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <div className="calendarGrid">
                    {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map(
                      (d) => (
                        <small key={d}>{d}</small>
                      ),
                    )}
                    {calendarCells(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5)) - 1,
                    ).map((day, i) => {
                      const iso = month + "-" + String(day).padStart(2, "0");
                      const es = shown.events.filter(
                        (e) =>
                          e.date === iso &&
                          (classId === "all" ||
                            e.childIds.some(
                              (id) =>
                                shown.children.find((c) => c.id === id)
                                  ?.classId === classId,
                            )),
                      );
                      return day ? (
                        <button
                          key={i}
                          className={
                            (eventDay === iso ? "picked " : "") +
                            (iso === date ? "today" : "")
                          }
                          onClick={() =>
                            setEventDay(eventDay === iso ? "" : iso)
                          }
                        >
                          <strong>{day}</strong>
                          {es.map((e) => (
                            <span key={e.id}>{e.title}</span>
                          ))}
                        </button>
                      ) : (
                        <div key={i} />
                      );
                    })}
                  </div>
                </section>
                <section className="panel">
                  <h2>{eventDay ? dateLabel(eventDay) : "Eventos do mês"}</h2>
                  {[...shown.events]
                    .filter(
                      (e) =>
                        e.date.startsWith(month) &&
                        (!eventDay || e.date === eventDay) &&
                        (classId === "all" ||
                          e.childIds.some(
                            (id) =>
                              shown.children.find((c) => c.id === id)
                                ?.classId === classId,
                          )),
                    )
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((e) => (
                      <div className="eventDetails" key={e.id}>
                        <span className="badge">
                          {dateLabel(e.date)} · {e.time}
                        </span>
                        <h3>{e.title}</h3>
                        <p>{e.place}</p>
                        <small>
                          {[
                            ...new Set(
                              e.childIds.map(
                                (id) =>
                                  shown.children.find((c) => c.id === id)
                                    ?.group,
                              ),
                            ),
                          ].join(" · ")}
                        </small>
                      </div>
                    ))}
                  <button
                    className="secondary"
                    onClick={() => {
                      openModal("event");
                      setForm((f) => ({
                        ...f,
                        date: eventDay || month + "-01",
                      }));
                    }}
                  >
                    Adicionar evento <Icon name="plus" size={16} />
                  </button>
                </section>
              </div>
              <p className="subtle">
                As famílias visualizam a agenda separada por filho e turma.
              </p>
            </>
          )}
          {page === pages[5] && can(actor, pagePermissions[5]) && (
            <>
              <div className="metrics">
                <article>
                  <small>Em aberto</small>
                  <strong className="amount">{money(open)}</strong>
                  <p>Saldo a receber</p>
                </article>
                <article className="softGreen">
                  <small>Recebido</small>
                  <strong className="amount">{money(paid)}</strong>
                  <p>Pagamentos registrados</p>
                </article>
                <article>
                  <small>Organização</small>
                  <strong className="amount">Por família</strong>
                  <p>Uma cobrança, mais facilidade</p>
                </article>
              </div>
              <section className="panel">
                <div className="sectionTitle">
                  <h2>Cobranças por responsável</h2>
                  <span className="badge">Valores demonstrativos</span>
                </div>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Responsável / filhos</th>
                        <th>Referência</th>
                        <th>Vencimento</th>
                        <th>Total</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slicePage(families).flatMap((a) =>
                        consolidateInvoices(
                          shown.invoices.filter((i) =>
                            a.childIds?.includes(i.childId),
                          ),
                        ).map((g) => (
                          <tr key={a.id + g.id}>
                            <td>
                              <strong>{a.name}</strong>
                              <small>
                                {[...new Set(g.invoices.map((i) => i.childId))]
                                  .map(
                                    (id) =>
                                      shown.children.find((c) => c.id === id)
                                        ?.name,
                                  )
                                  .join(" + ")}
                              </small>
                            </td>
                            <td>
                              {g.reference}
                              <details>
                                <summary>Ver composição</summary>
                                {g.invoices.map((i) => (
                                  <p key={i.id}>
                                    {
                                      shown.children.find(
                                        (c) => c.id === i.childId,
                                      )?.name
                                    }{" "}
                                    · {money(i.amount)}
                                  </p>
                                ))}
                              </details>
                            </td>
                            <td>{g.due.split("-").reverse().join("/")}</td>
                            <td>
                              <strong>{money(g.amount)}</strong>
                            </td>
                            <td>
                              <span
                                className={
                                  "badge " +
                                  (g.status === "paid" ? "green" : "orange")
                                }
                              >
                                {g.status === "paid" ? "Pago" : "Em aberto"}
                              </span>
                            </td>
                          </tr>
                        )),
                      )}
                      {shown.invoices
                        .filter(
                          (i) =>
                            !shown.actors.some(
                              (a) =>
                                a.role === "family" &&
                                a.childIds?.includes(i.childId),
                            ),
                        )
                        .map((i) => (
                          <tr key={i.id}>
                            <td>
                              <strong>
                                {
                                  shown.children.find((c) => c.id === i.childId)
                                    ?.name
                                }
                              </strong>
                              <small>
                                Responsável financeiro ainda não vinculado
                              </small>
                            </td>
                            <td>{i.reference}</td>
                            <td>{i.due}</td>
                            <td>{money(i.amount)}</td>
                            <td>
                              {i.status === "paid" ? "Pago" : "Em aberto"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  total={families.length}
                  page={listPage}
                  setPage={setListPage}
                />
                <p className="subtle">
                  Integração de Pix, boleto e conciliação bancária será
                  necessária para cobranças reais.
                </p>
              </section>
            </>
          )}
          {page === pages[8] && can(actor, "units.manage") && (
            <>
              <div className="metrics">
                <article>
                  <small>Unidades</small>
                  <strong>{shown.units.length}</strong>
                  <p>Endereços independentes</p>
                </article>
                <article>
                  <small>Turmas</small>
                  <strong>{shown.classes.length}</strong>
                  <p>Vinculadas à sua unidade</p>
                </article>
                <article>
                  <small>Alunos matriculados</small>
                  <strong>{shown.children.length}</strong>
                  <p>Visão da seleção atual</p>
                </article>
              </div>
              <div className="unitGrid">
                {shown.units.map((u) => (
                  <section className="panel unitCard" key={u.id}>
                    <span className="eyebrow">UNIDADE ESCOLAR</span>
                    <h2>{u.name}</h2>
                    <p className="bodyCopy">
                      {u.address.street}, {u.address.number}
                      <br />
                      {u.address.neighborhood} · {u.address.city}/
                      {u.address.state}
                      <br />
                      CEP {u.address.postalCode}
                    </p>
                    <div className="settingRow">
                      <span>Turmas / alunos</span>
                      <strong>
                        {shown.classes.filter((g) => g.unitId === u.id).length}{" "}
                        /{" "}
                        {shown.children.filter((c) => c.unitId === u.id).length}
                      </strong>
                    </div>
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() => {
                          openModal("unit");
                          setForm({
                            name: u.name,
                            unitIdToEdit: u.id,
                            ...u.address,
                          });
                        }}
                      >
                        Editar unidade
                      </button>
                      <button
                        className="primary"
                        onClick={() => {
                          openModal("class");
                          setForm({ name: "", unitId: u.id, capacity: "16" });
                        }}
                      >
                        Nova turma
                      </button>
                    </div>
                  </section>
                ))}
              </div>
              <section className="panel">
                <h2>Turmas e capacidade</h2>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Turma</th>
                        <th>Unidade</th>
                        <th>Alunos</th>
                        <th>Vagas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.classes.map((g) => {
                        const enrolled = shown.children.filter(
                          (c) => c.classId === g.id,
                        ).length;
                        return (
                          <tr key={g.id}>
                            <td>
                              <strong>{g.name}</strong>
                            </td>
                            <td>
                              {shown.units.find((u) => u.id === g.unitId)?.name}
                            </td>
                            <td>
                              {enrolled} / {g.capacity}
                            </td>
                            <td>{Math.max(0, g.capacity - enrolled)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === pages[6] && can(actor, pagePermissions[6]) && (
            <div className="settingsGrid">
              <section className="panel">
                <span className="eyebrow">A ESCOLA</span>
                <h2>{shown.school.name}</h2>
                <div className="settingRow">
                  <span>Ambiente</span>
                  <strong>Demonstração</strong>
                </div>
                <div className="settingRow">
                  <span>Aplicativo</span>
                  <strong>thinkEdu · v0.1.0</strong>
                </div>
                <div className="settingRow">
                  <span>Organização</span>
                  <strong>ThinkSystems</strong>
                </div>
                <p className="bodyCopy">
                  Neste ambiente, os dados são fictícios.{" "}
                  {api
                    ? "Alterações são salvas na API conectada."
                    : "Alterações são salvas neste navegador."}
                </p>
              </section>
              <section className="panel">
                <span className="eyebrow">PUBLICAÇÃO</span>
                <h2>Atualizações do aplicativo</h2>
                <span className="badge orange">
                  Lojas ainda não configuradas
                </span>
                <p className="bodyCopy">
                  Os links oficiais da App Store e do Google Play serão
                  cadastrados após a publicação. O aviso de atualização ficará
                  desativado enquanto esses endereços não estiverem disponíveis.
                </p>
                <div className="settingRow">
                  <span>App Store</span>
                  <strong>Aguardando publicação</strong>
                </div>
                <div className="settingRow">
                  <span>Google Play</span>
                  <strong>Aguardando publicação</strong>
                </div>
              </section>
              {can(actor, "audit.read") && (
                <section className="panel">
                  <h2>Últimas alterações</h2>
                  {[...shown.audit]
                    .reverse()
                    .slice(0, 6)
                    .map((a) => (
                      <div className="settingRow" key={a.id}>
                        <span>
                          {(
                            {
                              "user.create": "Usuário cadastrado",
                              "user.update": "Acesso atualizado",
                              "student.create": "Aluno cadastrado",
                              "notice.create": "Comunicado publicado",
                              "mural.create": "Publicação no mural",
                              "event.create": "Evento criado",
                              "attendance.save": "Chamada atualizada",
                              "message.send": "Mensagem enviada",
                            } as Record<string, string>
                          )[a.type] || a.type}
                        </span>
                        <small>{dateLabel(a.at.slice(0, 10))}</small>
                      </div>
                    ))}
                  {!shown.audit.length && (
                    <p className="subtle">
                      As ações realizadas serão registradas aqui.
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
          {page === pages[7] && can(actor, "users.manage") && (
            <>
              <section className="panel">
                <div className="sectionTitle">
                  <h2>Equipe da escola</h2>
                  <span className="badge">
                    Acesso compartilhado · Web + App
                  </span>
                </div>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Pessoa</th>
                        <th>Perfil</th>
                        <th>Turmas</th>
                        <th>Situação</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {shown.actors
                        .filter((a) => a.role !== "family")
                        .map((a) => (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.name}</strong>
                            </td>
                            <td>{roleLabels[a.role]}</td>
                            <td>
                              {a.role === "teacher"
                                ? (a.classIds || [])
                                    .map(
                                      (cid) =>
                                        classes.find(([id]) => id === cid)?.[1],
                                    )
                                    .join(", ")
                                : a.unitIds
                                  ? a.unitIds
                                      .map(
                                        (id) =>
                                          authorized.units.find(
                                            (u) => u.id === id,
                                          )?.name,
                                      )
                                      .join(", ")
                                  : "Todas as unidades"}
                            </td>
                            <td>
                              <span
                                className={
                                  "badge " +
                                  (a.active !== false ? "green" : "orange")
                                }
                              >
                                {a.active !== false ? "Ativo" : "Desativado"}
                              </span>
                            </td>
                            <td>
                              <button
                                disabled={
                                  a.role === "administrator" &&
                                  !can(actor, "access.manage")
                                }
                                onClick={() => {
                                  openModal("user");
                                  setForm({
                                    userId: a.id,
                                    name: a.name,
                                    role:
                                      a.role === "admin" ? "director" : a.role,
                                    active: String(a.active !== false),
                                    classes: (a.classIds || []).join(","),
                                    units: a.unitIds?.join(",") || "all",
                                  });
                                }}
                              >
                                Editar acesso
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel permissionPanel">
                <h2>O que cada perfil pode fazer</h2>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Área</th>
                        {staffRoles
                          .filter(
                            (r) =>
                              r !== "administrator" ||
                              can(actor, "access.manage"),
                          )
                          .map((r) => (
                            <th key={r}>{roleLabels[r]}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Cadastros", "students.write"],
                        ["Rotinas pedagógicas", "routines.write"],
                        ["Presença", "attendance.write"],
                        ["Comunicados e mural", "communication.write"],
                        ["Conversas individuais", "messages.write"],
                        ["Calendário", "calendar.write"],
                        ["Financeiro", "finance.read"],
                        ["Usuários e permissões", "users.manage"],
                      ].map(([label, p]) => (
                        <tr key={p}>
                          <td>{label}</td>
                          {staffRoles.map((r) => (
                            <td key={r}>
                              {(rolePermissions[r] || []).includes(p)
                                ? r === "teacher"
                                  ? "Suas turmas"
                                  : "Permitido"
                                : "Sem acesso"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <footer>
            <span>thinkEdu de ThinkSystems</span>
            <span>Mais tempo para educar.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
      <dialog
        aria-label="Detalhes e edição da escola"
        ref={dialog}
        onCancel={() => {
          setModal("");
          setError("");
        }}
        onClose={() => setModal("")}
      >
        <div className="dialogHeader">
          <span className="eyebrow">ESCOLA SEMENTE</span>
          <button
            className="iconButton"
            aria-label="Fechar"
            onClick={() => {
              setModal("");
              setError("");
            }}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2>
          {
            (
              {
                unit: form.unitIdToEdit
                  ? "Editar unidade"
                  : "Uma nova unidade.",
                class: "Uma nova turma.",
                user: form.userId
                  ? "Editar acesso"
                  : "Uma nova pessoa na equipe.",
                enroll: "Um novo começo na escola.",
                notice: "Uma mensagem, o destino certo.",
                post: "Uma nova história no mural.",
                event: "Vamos marcar um encontro?",
                attendance: "Registrar presença",
                student: selected?.name,
                message: "Conversa com a família",
              } as Record<string, string>
            )[modal]
          }
        </h2>
        {modal === "student" && selected ? (
          <>
            <div className="studentHero">
              <Face child={selected} />
              <div>
                <h3>{selected.name}</h3>
                <p>{selected.group}</p>
                {can(actor, "attendance.read") && status(selected)}
              </div>
            </div>
            <div className="settingRow">
              <span>Responsável</span>
              <strong>
                {shown.actors
                  .filter(
                    (a) =>
                      a.role === "family" && a.childIds?.includes(selected.id),
                  )
                  .map((a) => a.name)
                  .join(", ") || "Ainda não vinculado"}
              </strong>
            </div>
            <div className="settingRow">
              <span>Data consultada</span>
              <strong>{dateLabel(date)}</strong>
            </div>
            {routines
              .filter((r) => r.childId === selected.id)
              .map((r) => (
                <div className="routineDetail" key={r.id}>
                  <span
                    className={"badge " + (r.published ? "green" : "orange")}
                  >
                    {r.published ? "Rotina publicada" : "Rascunho da educadora"}
                  </span>
                  <p>
                    Alimentação: {r.meal} · Sono: {r.sleep} min
                  </p>
                  <p>
                    {r.mood} · Higiene: {r.hygiene}
                  </p>
                  <p>{r.note}</p>
                </div>
              ))}
            {can(actor, "routines.read") &&
              !routines.some((r) => r.childId === selected.id) && (
                <p className="empty">
                  Ainda não há rotina registrada neste dia.
                </p>
              )}
            <div className="actions">
              <button
                className="secondary"
                onClick={() => openModal("message", selected)}
              >
                Conversar
              </button>
              <button
                className="primary"
                onClick={() => openModal("attendance", selected)}
              >
                Registrar presença
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            {modal === "message" && selected && (
              <>
                <p className="subtle">
                  Sobre {selected.name} · {selected.group}
                </p>
                <div className="conversation">
                  {shown.messages
                    .filter((m) => m.childId === selected.id)
                    .map((m) => (
                      <div
                        key={m.id}
                        className={m.senderId === actor.id ? "own" : ""}
                      >
                        <small>
                          {shown.actors.find((a) => a.id === m.senderId)
                            ?.name || "Equipe escolar"}
                        </small>
                        <p>{m.body}</p>
                      </div>
                    ))}
                </div>
              </>
            )}
            {modal === "unit" && (
              <>
                {field("name", "Nome da unidade")}
                {field("street", "Logradouro")}
                {field("number", "Número")}
                {field("neighborhood", "Bairro")}
                {field("city", "Cidade")}
                {field("state", "UF")}
                {field("postalCode", "CEP")}
              </>
            )}
            {modal === "class" && (
              <>
                {field("name", "Nome da turma")}
                <label>
                  Unidade
                  <select
                    aria-label="Unidade da turma"
                    value={form.unitId || ""}
                    onChange={(e) =>
                      setForm({ ...form, unitId: e.target.value })
                    }
                  >
                    {authorized.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                {field("capacity", "Capacidade de alunos", "number")}
              </>
            )}
            {modal === "user" && (
              <>
                {field("name", "Nome da pessoa")}
                <label>
                  Perfil de acesso
                  <select
                    value={form.role || "coordinator"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role: e.target.value,
                        ...(e.target.value === "administrator"
                          ? { units: "all", classes: "" }
                          : {}),
                      })
                    }
                  >
                    {staffRoles.map((r) => (
                      <option key={r} value={r}>
                        {roleLabels[r]}
                      </option>
                    ))}
                  </select>
                </label>
                {form.role !== "administrator" && (
                  <fieldset>
                    <legend>Unidades autorizadas</legend>
                    <label className="classCheck">
                      <input
                        type="checkbox"
                        checked={form.units === "all"}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            units: e.target.checked ? "all" : "",
                            classes: "",
                          })
                        }
                      />
                      Todas as unidades da escola
                    </label>
                    {authorized.units.map((u) => (
                      <label className="classCheck" key={u.id}>
                        <input
                          type="checkbox"
                          checked={
                            form.units === "all" ||
                            (form.units || "").split(",").includes(u.id)
                          }
                          disabled={form.units === "all"}
                          onChange={(e) => {
                            const ids = (form.units || "")
                              .split(",")
                              .filter(Boolean);
                            setForm({
                              ...form,
                              units: (e.target.checked
                                ? [...ids, u.id]
                                : ids.filter((id) => id !== u.id)
                              ).join(","),
                              classes: "",
                            });
                          }}
                        />
                        {u.name}
                      </label>
                    ))}
                  </fieldset>
                )}
                {form.role === "teacher" && (
                  <fieldset>
                    <legend>Turmas autorizadas</legend>
                    {authorized.classes
                      .filter(
                        (g) =>
                          form.units === "all" ||
                          (form.units || "").split(",").includes(g.unitId),
                      )
                      .map((g) => [
                        g.id,
                        `${g.name} · ${authorized.units.find((u) => u.id === g.unitId)?.name}`,
                      ])
                      .map(([id, n]) => (
                        <label className="classCheck" key={id}>
                          <input
                            type="checkbox"
                            checked={(form.classes || "")
                              .split(",")
                              .includes(id)}
                            onChange={(e) => {
                              const ids = (form.classes || "")
                                .split(",")
                                .filter(Boolean);
                              setForm({
                                ...form,
                                classes: (e.target.checked
                                  ? [...ids, id]
                                  : ids.filter((cid) => cid !== id)
                                ).join(","),
                              });
                            }}
                          />
                          {n}
                        </label>
                      ))}
                  </fieldset>
                )}
                <label>
                  Situação
                  <select
                    value={form.active || "true"}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.value })
                    }
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Desativado</option>
                  </select>
                </label>
                <p className="subtle">
                  Permissões aplicadas à web e ao aplicativo. Professores
                  acessam apenas as turmas vinculadas. Nesta demonstração, a
                  escolha do perfil substitui o login real.
                </p>
              </>
            )}
            {modal === "enroll" && (
              <>
                {field("name", "Nome do aluno")}
                <label>
                  Turma
                  <select
                    required
                    value={form.classId || ""}
                    onChange={(e) =>
                      setForm({ ...form, classId: e.target.value })
                    }
                  >
                    <option value="">Selecione a turma</option>
                    {classes.map(([id, n]) => (
                      <option key={id} value={id}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Responsável
                  <select
                    value={form.guardianId || ""}
                    onChange={(e) =>
                      setForm({ ...form, guardianId: e.target.value })
                    }
                  >
                    <option value="">Cadastrar um responsável</option>
                    {shown.actors
                      .filter((a) => a.role === "family")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                {!form.guardianId &&
                  field("guardianName", "Nome do responsável")}
                <p className="subtle">
                  Cadastro demonstrativo. Convites de acesso e matrícula formal
                  serão conectados ao serviço de autenticação.
                </p>
              </>
            )}
            {["notice", "post", "event"].includes(modal) && (
              <>
                {field("title", "Título")}
                {destinations}
              </>
            )}
            {modal === "notice" && (
              <label>
                Tipo
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  <option value="update">Comunicado</option>
                  <option value="request">Solicitação de material</option>
                  <option value="authorization">Autorização</option>
                </select>
              </label>
            )}
            {modal === "notice" &&
              form.kind !== "update" &&
              field("due", "Prazo de resposta", "date")}
            {modal === "post" && (
              <>
                <label>
                  Formato
                  <select
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  >
                    <option value="update">Texto</option>
                    <option value="video">Vídeo</option>
                    <option value="file">Arquivo PDF</option>
                  </select>
                </label>
                {form.kind !== "update" && (
                  <>
                    {field("url", "Link público HTTPS", "url")}
                    {field("filename", "Nome do material")}
                    <p className="subtle">
                      Use um endereço HTTPS do material já hospedado. Envio
                      direto de arquivos será integrado ao armazenamento da
                      escola.
                    </p>
                  </>
                )}
              </>
            )}
            {modal === "event" && (
              <>
                {field("date", "Data", "date")}
                {field("time", "Horário", "time")}
                {field("place", "Local")}
              </>
            )}
            {modal === "attendance" && (
              <>
                <p>
                  {selected?.name} · {selected?.group}
                </p>
                {field("date", "Data", "date")}
                <label>
                  Situação
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="present">Na escola</option>
                    <option value="absent">Ausente</option>
                    <option value="left">Saída registrada</option>
                  </select>
                </label>
                {form.status !== "absent" &&
                  field("arrival", "Entrada", "time")}
                {form.status === "left" && field("departure", "Saída", "time")}
              </>
            )}
            {!["event", "enroll", "user"].includes(modal) && (
              <label>
                {modal === "attendance" ? "Observação" : "Mensagem"}
                <textarea
                  required={modal !== "attendance"}
                  maxLength={modal === "attendance" ? 1000 : 2000}
                  value={form.body || ""}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal("")}
              >
                Cancelar
              </button>
              <button
                className="primary"
                disabled={busy || (!!api && !connected)}
              >
                {busy
                  ? "Salvando…"
                  : modal === "message"
                    ? "Enviar mensagem"
                    : modal === "attendance"
                      ? "Salvar presença"
                      : ["unit", "class"].includes(modal)
                        ? "Salvar cadastro"
                        : modal === "user"
                          ? "Salvar acesso"
                          : modal === "enroll"
                            ? "Cadastrar aluno"
                            : modal === "event"
                              ? "Criar evento"
                              : "Publicar"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
