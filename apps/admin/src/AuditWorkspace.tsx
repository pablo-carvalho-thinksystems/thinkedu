import React, { useEffect, useState } from "react";
import type {
  Actor,
  AuditEntry,
  VisibleStore,
} from "../../../packages/core/model.mjs";
import {
  auditLabels,
  auditTime,
  filterAudit,
  csvAudit,
} from "../../../packages/core/audit.mjs";
import {
  can,
  roleLabels,
  staffRoles,
} from "../../../packages/core/permissions.mjs";
type Result = {
  entries: AuditEntry[];
  total: number;
  integrity?: { verified: boolean; count: number };
  actorOptions?: { id: string; name: string }[];
  typeOptions?: string[];
};
export function AuditWorkspace({
  data,
  actor,
  api,
  token,
  onCommand,
}: {
  data: VisibleStore;
  actor: Actor;
  api?: string;
  token: string;
  onCommand: (command: Record<string, unknown>) => Promise<unknown>;
}) {
  const [changeLimit, setChangeLimit] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [page, setPage] = useState(1),
    [result, setResult] = useState<Result>({ entries: [], total: 0 }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<AuditEntry | null>(null);
  const query = (format?: string) =>
    new URLSearchParams({
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      page: String(page),
      limit: "25",
      ...(format ? { format } : {}),
    });
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      (async () => {
        try {
          let next: Result;
          if (api) {
            const r = await fetch(`${api}/audit?${query()}`, {
              headers: {
                Authorization: "Bearer " + token,
                "X-ThinkEdu-Client": "web",
              },
            });
            next = await r.json();
            if (!r.ok)
              throw Error((next as unknown as { error: string }).error);
          } else {
            const list = filterAudit(data.audit, filters);
            next = {
              entries: list.slice((page - 1) * 25, page * 25),
              total: list.length,
              actorOptions: [
                ...new Map(
                  data.audit.map((e) => [
                    e.actorId || "",
                    {
                      id: e.actorId || "",
                      name: e.actorName || "Não identificado",
                    },
                  ]),
                ).values(),
              ],
              typeOptions: [...new Set(data.audit.map((e) => e.type))],
            };
          }
          if (active) setResult(next);
        } catch (e) {
          if (active) setError((e as Error).message);
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    JSON.stringify(filters),
    page,
    revision,
    token,
    actor.id,
    data.audit.length,
  ]);
  const update = (k: string, v: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  };
  async function exportFile(format: "csv" | "json") {
    setError("");
    try {
      let blob: Blob;
      if (api) {
        const r = await fetch(`${api}/audit?${query(format)}`, {
          headers: {
            Authorization: "Bearer " + token,
            "X-ThinkEdu-Client": "web",
          },
        });
        if (!r.ok) throw Error((await r.json()).error);
        blob = await r.blob();
      } else {
        const entries = filterAudit(data.audit, filters);
        blob = new Blob(
          [
            format === "csv"
              ? csvAudit(entries)
              : JSON.stringify(entries, null, 2),
          ],
          {
            type:
              format === "csv" ? "text/csv;charset=utf-8" : "application/json",
          },
        );
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thinkedu-auditoria.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setRevision((r) => r + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="metrics">
        <article>
          <small>Registros no filtro</small>
          <strong>{result.total}</strong>
          <p>Ações, consultas e tentativas de acesso</p>
        </article>
        <article>
          <small>Integridade do histórico</small>
          <strong style={{ fontSize: 24 }}>
            {api
              ? result.integrity?.verified
                ? "Verificada"
                : "Aguardando"
              : "Modo local"}
          </strong>
          <p>
            {api ? "Histórico assinado e encadeado" : "Sem assinatura da API"}
          </p>
        </article>
        <article>
          <small>Fuso dos registros</small>
          <strong style={{ fontSize: 24 }}>Brasília</strong>
          <p>Data e hora com segundos</p>
        </article>
      </div>
      <section className="panel">
        <div className="sectionTitle">
          <h2>Histórico de auditoria</h2>
          <div className="actions">
            <button
              className="secondary"
              onClick={() => setRevision((r) => r + 1)}
            >
              Atualizar histórico
            </button>
            <button
              className="secondary"
              onClick={() => void exportFile("csv")}
            >
              Exportar CSV
            </button>
            <button
              className="secondary"
              onClick={() => void exportFile("json")}
            >
              Exportar JSON
            </button>
          </div>
        </div>
        <p className="subtle">
          Histórico de toda a escola, incluindo todas as unidades. Cada ação
          preserva quem fez, quando, o resultado e as alterações. Registros
          antigos podem não ter todos esses detalhes.
        </p>
        <div className="auditFilters">
          <label>
            De
            <input
              aria-label="Auditoria desde"
              type="date"
              value={filters.from || ""}
              onChange={(e) => update("from", e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              aria-label="Auditoria até"
              type="date"
              value={filters.to || ""}
              onChange={(e) => update("to", e.target.value)}
            />
          </label>
          <label>
            Pessoa
            <select
              aria-label="Pessoa da auditoria"
              value={filters.actorId || ""}
              onChange={(e) => update("actorId", e.target.value)}
            >
              <option value="">Todas as pessoas</option>
              {result.actorOptions
                ?.filter((a) => a.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Ação
            <select
              aria-label="Ação da auditoria"
              value={filters.type || ""}
              onChange={(e) => update("type", e.target.value)}
            >
              <option value="">Todas as ações</option>
              {result.typeOptions?.map((t) => (
                <option key={t} value={t}>
                  {auditLabels[t] || t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Resultado
            <select
              aria-label="Resultado da auditoria"
              value={filters.outcome || ""}
              onChange={(e) => update("outcome", e.target.value)}
            >
              <option value="">Todos os resultados</option>
              <option value="succeeded">Concluída</option>
              <option value="denied">Acesso negado</option>
              <option value="failed">Falha</option>
            </select>
          </label>
          <label>
            Origem
            <select
              aria-label="Origem da auditoria"
              value={filters.source || ""}
              onChange={(e) => update("source", e.target.value)}
            >
              <option value="">Todas as origens</option>
              <option value="web">Administrativo</option>
              <option value="app">Aplicativo</option>
              <option value="api">API</option>
              <option value="local">Local</option>
            </select>
          </label>
          <label>
            Busca
            <input
              aria-label="Buscar no histórico"
              placeholder="Pessoa, ação ou registro"
              value={filters.search || ""}
              onChange={(e) => update("search", e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {loading && <p className="subtle">Consultando o histórico…</p>}
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Quando / pessoa</th>
                <th>Ação</th>
                <th>Resultado</th>
                <th>Origem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{auditTime(e.at)}</strong>
                    <small>
                      {e.actorName || "Nome não registrado"} ·{" "}
                      {roleLabels[e.actorRole || ""] ||
                        e.actorRole ||
                        "Perfil não registrado"}
                    </small>
                  </td>
                  <td>
                    <strong>{auditLabels[e.type] || e.type}</strong>
                    <small>{e.subject || "Escola"}</small>
                  </td>
                  <td>
                    <span
                      className={
                        "badge " +
                        (e.outcome === "denied" || e.outcome === "failed"
                          ? "orange"
                          : "green")
                      }
                    >
                      {e.legacy
                        ? "Registro anterior"
                        : e.outcome === "denied"
                          ? "Acesso negado"
                          : e.outcome === "failed"
                            ? "Falha"
                            : "Concluída"}
                    </span>
                  </td>
                  <td>
                    {e.source === "web"
                      ? "Administrativo"
                      : e.source === "app"
                        ? "Aplicativo"
                        : e.source || "Anterior"}
                  </td>
                  <td>
                    <button
                      className="secondary"
                      onClick={() => {
                        setChangeLimit(20);
                        setSelected(e);
                      }}
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result.entries.length && !loading && (
          <p className="empty">Nenhum registro encontrado.</p>
        )}
        <div className="pagination">
          <span>
            Página {page} · {result.total} registros
          </span>
          <button
            className="secondary"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <button
            className="secondary"
            disabled={page * 25 >= result.total || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      </section>
      {can(actor, "audit.manage") && (
        <section className="panel">
          <h2>Quem pode consultar este histórico?</h2>
          <p className="bodyCopy">
            A Administração mantém o controle. A liberação permite consultar e
            exportar o histórico de toda a escola, incluindo dados anteriores e
            posteriores às alterações de todas as unidades.
          </p>
          <div className="auditGrants">
            <fieldset>
              <legend>Liberação por perfil</legend>
              {staffRoles
                .filter((r) => r !== "administrator")
                .map((r) => (
                  <label className="classCheck" key={r}>
                    <input
                      type="checkbox"
                      aria-label={`Auditoria para ${roleLabels[r]}`}
                      checked={data.auditAccessRoles.includes(r)}
                      onChange={(e) =>
                        void onCommand({
                          type: "audit.access",
                          role: r,
                          allowed: e.target.checked,
                        })
                      }
                    />
                    {roleLabels[r]}
                  </label>
                ))}
            </fieldset>
            <fieldset>
              <legend>Liberação individual adicional</legend>
              {data.actors
                .filter(
                  (a) => a.role !== "family" && a.role !== "administrator",
                )
                .map((a) => (
                  <label className="classCheck" key={a.id}>
                    <input
                      type="checkbox"
                      aria-label={`Auditoria individual para ${a.name}`}
                      checked={a.auditAccess === true}
                      onChange={(e) =>
                        void onCommand({
                          type: "audit.access",
                          userId: a.id,
                          allowed: e.target.checked,
                        })
                      }
                    />
                    <span>
                      {a.name}
                      <small>
                        {roleLabels[a.role]}
                        {data.auditAccessRoles.includes(
                          a.role === "admin" ? "director" : a.role,
                        )
                          ? " · Acesso também herdado do perfil"
                          : ""}
                      </small>
                    </span>
                  </label>
                ))}
            </fieldset>
          </div>
        </section>
      )}
      {selected && (
        <div className="auditOverlay" role="presentation">
          <section
            className="auditDetail panel"
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes da auditoria"
          >
            <div className="sectionTitle">
              <h2>{auditLabels[selected.type] || selected.type}</h2>
              <button
                className="secondary"
                autoFocus
                onClick={() => setSelected(null)}
              >
                Fechar detalhes
              </button>
            </div>
            <p>
              {selected.actorName || "Nome não registrado"} ·{" "}
              {auditTime(selected.at)}
            </p>
            <p className="subtle">
              Registro: {selected.subject || "Escola"} · Solicitação:{" "}
              {selected.requestId || "Não registrada"}
            </p>
            {selected.error && <p className="error">{selected.error}</p>}
            {selected.legacy && (
              <p className="subtle">
                Registro anterior à auditoria detalhada. Dados anteriores e
                posteriores não estão disponíveis.
              </p>
            )}
            {selected.changes?.slice(0, changeLimit).map((c, i) => (
              <details key={i}>
                <summary>
                  {c.collection} · {c.operation} · {c.id}
                </summary>
                <div className="auditDiff">
                  <div>
                    <h3>Antes</h3>
                    <pre>{JSON.stringify(c.before, null, 2)}</pre>
                  </div>
                  <div>
                    <h3>Depois</h3>
                    <pre>{JSON.stringify(c.after, null, 2)}</pre>
                  </div>
                </div>
              </details>
            ))}
            {(selected.changes?.length || 0) > changeLimit && (
              <button
                className="secondary"
                onClick={() => setChangeLimit((n) => n + 20)}
              >
                Carregar mais alterações · {changeLimit} de{" "}
                {selected.changes?.length}
              </button>
            )}
            {!selected.changes?.length && (
              <p className="subtle">Esta ação não alterou registros.</p>
            )}
            <details>
              <summary>Informações da solicitação</summary>
              <pre>{JSON.stringify(selected.metadata || {}, null, 2)}</pre>
            </details>
          </section>
        </div>
      )}
    </>
  );
}
