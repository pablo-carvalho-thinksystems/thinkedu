import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  applyCommand,
  createSeed,
  money,
  visibleState,
} from "../../../packages/core/model.mjs";
import "./style.css";
type Data = ReturnType<typeof createSeed>;
const seed = createSeed(),
  actor = seed.actors.find((a) => a.id === "direcao")!;
const storageKey = "thinkedu.admin.v1";
const api = (
  import.meta as unknown as { env: { VITE_API_URL?: string } }
).env.VITE_API_URL?.replace(/\/$/, "");
function Admin() {
  const [data, setData] = useState<Data>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : createSeed();
    } catch {
      return createSeed();
    }
  });
  const [tab, setTab] = useState("Visão geral"),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [token, setToken] = useState("");
  const [compose, setCompose] = useState(false),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!api) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch(`${api}/demo/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId: actor.id }),
        });
        if (!response.ok) throw new Error("Não foi possível conectar.");
        const session = await response.json();
        if (!active) return;
        setToken(session.token);
        const state = await fetch(`${api}/state`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (!state.ok) throw new Error("Não foi possível carregar a escola.");
        if (active) setData(await state.json());
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Falha de conexão.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const shown = api ? data : visibleState(data, actor);
  async function publish() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const command = {
        type: "notice.create",
        title,
        body,
        kind: "update",
        childIds: shown.children.map((c) => c.id),
      };
      let next;
      if (api) {
        const response = await fetch(`${api}/commands`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(command),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        next = result;
      } else {
        next = applyCommand(data, actor, command, "2026-10-09T15:00:00-03:00");
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      setData(next);
      setCompose(false);
      setTitle("");
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }
  const open = shown.invoices
    .filter((i) => i.status === "open")
    .reduce((v, i) => v + i.amount, 0);
  return (
    <div className="layout">
      <aside>
        <a className="brand" href="#">
          think<span>Edu</span>
          <b>·</b>
        </a>
        <small>THINKSYSTEMS · EDUCAÇÃO</small>
        <div className="school">
          <span>✳</span>
          <div>
            <strong>Escola Semente</strong>
            <small>Gestão escolar</small>
          </div>
        </div>
        <nav>
          {[
            "Visão geral",
            "Alunos",
            "Comunicados",
            "Calendário",
            "Financeiro",
          ].map((item, i) => (
            <button
              className={tab === item ? "active" : ""}
              onClick={() => {
                setTab(item);
                setSearch("");
              }}
              key={item}
            >
              <span>{["◉", "♧", "▤", "▦", "▣"][i]}</span>
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <p>
            Mais tempo para cuidar.
            <br />
            Mais clareza para acompanhar.
          </p>
          <small>Demonstração · v0.1.0</small>
          <a href="http://localhost:4341">Abrir aplicativo ↗</a>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <small>SEXTA, 9 DE OUTUBRO DE 2026</small>
            <h1>{tab === "Visão geral" ? "Sua escola, em um olhar." : tab}</h1>
          </div>
          <span className="adminAvatar">DS</span>
        </header>
        <div className="demo">
          Dados fictícios · {api ? "API conectada" : "demonstração local"}
          <span>Direção · Escola Semente</span>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {tab === "Visão geral" ? (
          <>
            <div className="metrics">
              <article className="sky">
                <small>ALUNOS CADASTRADOS</small>
                <strong>{shown.children.length}</strong>
                <p>Jardim II e Maternal I</p>
              </article>
              <article className="lime">
                <small>ROTINAS PUBLICADAS</small>
                <strong>
                  {shown.routines.filter((r) => r.published).length}
                </strong>
                <p>Registros de hoje</p>
              </article>
              <article className="peach">
                <small>EM ABERTO</small>
                <strong>{money(open)}</strong>
                <p>Mensalidades de outubro</p>
              </article>
            </div>
            <div className="columns">
              <section className="panel">
                <div className="sectionTitle">
                  <h2>O dia da escola</h2>
                  <button onClick={() => setTab("Alunos")}>Ver alunos ↗</button>
                </div>
                {shown.children.map((c) => (
                  <div className="listRow" key={c.id}>
                    <span className={`initial ${c.tone}`}>{c.initials}</span>
                    <div>
                      <strong>{c.name}</strong>
                      <small>{c.group}</small>
                    </div>
                    <span
                      className={
                        shown.routines.some(
                          (r) => r.childId === c.id && r.published,
                        )
                          ? "badge green"
                          : "badge orange"
                      }
                    >
                      {shown.routines.some(
                        (r) => r.childId === c.id && r.published,
                      )
                        ? "Rotina pronta"
                        : "Aguardando registro"}
                    </span>
                  </div>
                ))}
              </section>
              <section className="panel blue">
                <span className="motif">✳</span>
                <h2>
                  Perto de cada
                  <br />
                  família.
                </h2>
                <p>
                  Compartilhe novidades com os responsáveis de forma clara e
                  organizada.
                </p>
                <button
                  className="lightButton"
                  onClick={() => setCompose(true)}
                >
                  + Novo comunicado
                </button>
                <div className="line" />
                <small>{shown.notices.length} comunicados enviados</small>
              </section>
            </div>
            <section className="panel">
              <div className="sectionTitle">
                <h2>Próximos encontros</h2>
                <button onClick={() => setTab("Calendário")}>
                  Ver calendário ↗
                </button>
              </div>
              {shown.events.map((e) => (
                <div className="listRow" key={e.id}>
                  <span className="eventDate">
                    {e.date.slice(8)}
                    <small>OUT</small>
                  </span>
                  <div>
                    <strong>{e.title}</strong>
                    <small>
                      {e.time} · {e.place}
                    </small>
                  </div>
                  <span className="badge">{e.childIds.length} alunos</span>
                </div>
              ))}
            </section>
          </>
        ) : null}
        {tab === "Alunos" && (
          <section className="panel">
            <input
              aria-label="Buscar aluno"
              placeholder="Buscar por nome ou turma"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Entrada</th>
                    <th>Rotina</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.children
                    .filter((c) =>
                      `${c.name} ${c.group}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className={`initial ${c.tone}`}>
                            {c.initials}
                          </span>{" "}
                          {c.name}
                        </td>
                        <td>{c.group}</td>
                        <td>{c.arrival}</td>
                        <td>
                          {shown.routines.some(
                            (r) => r.childId === c.id && r.published,
                          )
                            ? "Publicada"
                            : "Pendente"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {tab === "Comunicados" && (
          <section className="panel">
            <div className="sectionTitle">
              <h2>Comunicados da escola</h2>
              <button className="primary" onClick={() => setCompose(true)}>
                + Novo comunicado
              </button>
            </div>
            {shown.notices.map((n) => (
              <article className="notice" key={n.id}>
                <small>
                  {n.type === "authorization"
                    ? "AUTORIZAÇÃO"
                    : n.type === "request"
                      ? "SOLICITAÇÃO"
                      : "ATUALIZAÇÃO"}{" "}
                  ·{" "}
                  {n.childIds
                    .map((id) => shown.children.find((c) => c.id === id)?.name)
                    .join(", ")}
                </small>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <span className="badge">
                  {n.readBy.length} leitura(s) · {n.responses.length}{" "}
                  resposta(s)
                </span>
              </article>
            ))}
          </section>
        )}
        {tab === "Calendário" && (
          <section className="panel">
            <h2>Outubro de 2026</h2>
            {shown.events
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => (
                <div key={e.id} className="listRow">
                  <span className="eventDate">
                    {e.date.slice(8)}
                    <small>OUT</small>
                  </span>
                  <div>
                    <strong>{e.title}</strong>
                    <small>
                      {e.time} · {e.place}
                    </small>
                    <small>
                      {e.childIds
                        .map(
                          (id) => shown.children.find((c) => c.id === id)?.name,
                        )
                        .join(", ")}
                    </small>
                  </div>
                </div>
              ))}
            <p className="muted">
              Os eventos podem ser criados no aplicativo da educadora.
            </p>
          </section>
        )}
        {tab === "Financeiro" && (
          <section className="panel">
            <div className="sectionTitle">
              <h2>Mensalidades</h2>
              <span className="badge">Valores ilustrativos</span>
            </div>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Referência</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.invoices.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {shown.children.find((c) => c.id === i.childId)?.name}
                      </td>
                      <td>{i.reference}</td>
                      <td>{i.due.split("-").reverse().join("/")}</td>
                      <td>{money(i.amount)}</td>
                      <td>
                        <span
                          className={`badge ${i.status === "paid" ? "green" : "orange"}`}
                        >
                          {i.status === "paid" ? "Pago" : "Em aberto"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Nenhum pagamento real é processado nesta demonstração.
            </p>
          </section>
        )}
        <footer>thinkEdu de ThinkSystems · Projeto de Educação</footer>
      </main>
      {compose && (
        <div className="overlay" onClick={() => setCompose(false)}>
          <form
            className="dialog"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              publish();
            }}
          >
            <h2>Uma mensagem. O destino certo.</h2>
            <p>
              Para os responsáveis dos {shown.children.length} alunos da Escola
              Semente.
            </p>
            <label>
              Título
              <input
                required
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Mensagem
              <textarea
                required
                maxLength={2000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <div className="actions">
              <button type="button" onClick={() => setCompose(false)}>
                Cancelar
              </button>
              <button disabled={busy} className="primary">
                {busy ? "Publicando…" : "Publicar comunicado"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Admin />);
