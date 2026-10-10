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
} from "../../../packages/core/model.mjs";
import { consolidateInvoices } from "../../../packages/core/billing.mjs";
import lia from "../../mobile/assets/lia-avatar.png";
import bento from "../../mobile/assets/bento-avatar.png";
import "./style.css";
const seed = createSeed(),
  actor = seed.actors.find((a) => a.id === "direcao")!,
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
function App() {
  const [data, setData] = useState<Store | VisibleStore>(() => {
    try {
      return upgradeStore(
        JSON.parse(localStorage.getItem(key) || "null") || createSeed(),
      );
    } catch {
      return createSeed();
    }
  });
  const [page, setPage] = useState(pages[0]),
    [search, setSearch] = useState(""),
    [classId, setClass] = useState("all"),
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
  const lock = useRef(false),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!api) return;
    let active = true;
    (async () => {
      try {
        const r = await fetch(api + "/demo/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId: actor.id }),
        });
        if (!r.ok) throw Error("Não foi possível iniciar a sessão.");
        const session = await r.json();
        const s = await fetch(api + "/state", {
          headers: { Authorization: "Bearer " + session.token },
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
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  const shown: VisibleStore = api
    ? (data as VisibleStore)
    : visibleState(data as Store, actor);
  const classes = [
    ...new Map(shown.children.map((c) => [c.classId, c.group])).entries(),
  ];
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
        <option value="all">Toda a escola</option>
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
      <td>{status(c)}</td>
      <td>{attendance.find((a) => a.childId === c.id)?.arrival || "—"}</td>
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
          <i>✳</i>
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
          {pages.map((p, i) => (
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
                  ][i]
                }
              />
              {p}
              {page === p && <span className="navDot" />}
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <div className="sidebarNote">
            <span>✳</span>
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
              <strong>Direção Semente</strong>
              <small>Administradora</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>
            Gestão escolar <b>/</b> {page}
          </span>
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
                  ][pages.indexOf(page)]
                }
              </p>
            </div>
            <button
              className="primary"
              onClick={() =>
                openModal(
                  page === pages[1]
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
              {page === pages[1]
                ? "Novo aluno"
                : page === "Calendário"
                  ? "Novo evento"
                  : page === "Comunicação" && channel === "Mural"
                    ? "Nova publicação"
                    : "Novo comunicado"}
            </button>
          </header>
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
          {page === pages[0] && (
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
                          <th>Presença</th>
                          <th>Entrada</th>
                          <th>Rotina</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>{children.map(row)}</tbody>
                    </table>
                  </div>
                  {!children.length && (
                    <p className="empty">Nenhum aluno nesta seleção.</p>
                  )}
                  <div className="panelFoot">
                    <span className="dot orangeDot" />
                    {pending.length} rotina(s) aguardando a equipe
                  </div>
                </section>
                <section className="connectionCard">
                  <div className="bigFlower">✳</div>
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
                  {pending.map((c) => (
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
          {(page === pages[1] || page === pages[2]) && (
            <>
              {page === pages[1] && (
                <div className="classCards">
                  {classes.map(([id, name]) => (
                    <button
                      className={
                        "classCard " + (classId === id ? "selected" : "")
                      }
                      key={id}
                      onClick={() => setClass(id)}
                    >
                      <span className="classMotif">✳</span>
                      <small>TURMA</small>
                      <h2>{name}</h2>
                      <p>
                        {shown.children.filter((c) => c.classId === id).length}{" "}
                        alunos ·{" "}
                        {shown.actors
                          .filter(
                            (a) =>
                              a.role === "teacher" && a.classIds?.includes(id),
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
                        <th>Presença</th>
                        <th>Entrada</th>
                        <th>Rotina</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>{children.map(row)}</tbody>
                  </table>
                </div>
                {!children.length && (
                  <p className="empty">Nenhum aluno encontrado.</p>
                )}
              </section>
            </>
          )}
          {page === pages[3] && (
            <>
              <div className="tabs">
                {["Comunicados", "Mural", "Conversas"].map((t) => (
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
                  {shown.notices.map((n) => (
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
                  {shown.posts.map((p) => (
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
                  {shown.children.map((c) => {
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
          {page === pages[4] && (
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
          {page === pages[5] && (
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
                      {shown.actors
                        .filter((a) => a.role === "family")
                        .flatMap((a) =>
                          consolidateInvoices(
                            shown.invoices.filter((i) =>
                              a.childIds?.includes(i.childId),
                            ),
                          ).map((g) => (
                            <tr key={a.id + g.id}>
                              <td>
                                <strong>{a.name}</strong>
                                <small>
                                  {[
                                    ...new Set(
                                      g.invoices.map((i) => i.childId),
                                    ),
                                  ]
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
                <p className="subtle">
                  Integração de Pix, boleto e conciliação bancária será
                  necessária para cobranças reais.
                </p>
              </section>
            </>
          )}
          {page === pages[6] && (
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
            </div>
          )}
          <footer>
            <span>thinkEdu de ThinkSystems</span>
            <span>Mais tempo para educar. ✳</span>
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
                {status(selected)}
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
            {!routines.some((r) => r.childId === selected.id) && (
              <p className="empty">Ainda não há rotina registrada neste dia.</p>
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
            {!["event", "enroll"].includes(modal) && (
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
