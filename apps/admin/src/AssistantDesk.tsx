import React, { useState } from "react";
import type { VisibleStore } from "../../../packages/core/model.mjs";
import { can } from "../../../packages/core/permissions.mjs";
const labels: Record<string, string> = {
  teacher: "Professor(a)",
  finance: "Financeiro",
  secretary: "Secretaria",
  coordinator: "Coordenação",
  director: "Diretoria",
};
export function AssistantDesk({
  data,
  busy,
  dispatch,
}: {
  data: VisibleStore;
  busy: boolean;
  dispatch: (c: Record<string, unknown>) => Promise<boolean>;
}) {
  const [tab, setTab] = useState("queue"),
    [selected, setSelected] = useState(""),
    [reply, setReply] = useState(""),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [unitId, setUnit] = useState(""),
    [classId, setClass] = useState(""),
    [expiresAt, setExpiry] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [editing, setEditing] = useState("");
  const thread = data.assistantThreads.find((t) => t.id === selected),
    manager = can(data.currentActor, "knowledge.manage");
  const save = async (active: boolean) => {
    if (
      await dispatch({
        type: "knowledge.save",
        knowledgeId: editing || undefined,
        question,
        answer,
        unitIds: unitId ? [unitId] : [],
        classIds: classId ? [classId] : [],
        expiresAt,
        active,
        generalConfirmed: confirmed,
      })
    ) {
      setQuestion("");
      setAnswer("");
      setConfirmed(false);
      setEditing("");
    }
  };
  return (
    <div className="serviceDesk">
      <div className="channelTabs">
        <button
          className={tab === "queue" ? "active" : ""}
          onClick={() => setTab("queue")}
        >
          Perguntas dos responsáveis
        </button>
        {manager && (
          <button
            className={tab === "knowledge" ? "active" : ""}
            onClick={() => setTab("knowledge")}
          >
            Conhecimento revisado
          </button>
        )}
      </div>
      {tab === "queue" ? (
        <div className="serviceColumns">
          <section className="panel">
            <h2>Caixa do Samuca</h2>
            <p>
              Somente perguntas do setor e dos alunos autorizados ao seu perfil.
            </p>
            {!data.assistantThreads.filter((t) => t.department).length && (
              <p>Nenhuma pergunta encaminhada para este perfil.</p>
            )}
            {data.assistantThreads
              .filter((t) => t.department)
              .map((t) => (
                <button
                  key={t.id}
                  className="serviceItem"
                  onClick={() => {
                    setSelected(t.id);
                    setReply("");
                  }}
                >
                  <strong>{t.question}</strong>
                  <span>
                    {data.children.find((c) => c.id === t.childId)?.name} ·{" "}
                    {labels[t.department || "secretary"]} ·{" "}
                    {t.status === "waiting"
                      ? "Aguardando retorno"
                      : "Respondida"}
                  </span>
                </button>
              ))}
          </section>
          <section className="panel">
            {thread ? (
              <>
                <small>
                  CONVERSA PRIVADA ·{" "}
                  {data.children.find((c) => c.id === thread.childId)?.name}
                </small>
                <h2>{thread.question}</h2>
                {thread.messages
                  .filter((m) => m.senderId !== "samuca")
                  .map((m) => (
                    <article className="serviceMessage" key={m.id}>
                      <small>
                        {data.actors.find((a) => a.id === m.senderId)?.name ||
                          "Responsável"}{" "}
                        · {new Date(m.at).toLocaleString("pt-BR")}
                      </small>
                      <p>{m.body}</p>
                    </article>
                  ))}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await dispatch({
                        type: "assistant.reply",
                        threadId: thread.id,
                        body: reply,
                      })
                    )
                      setReply("");
                  }}
                >
                  <label>
                    Resposta ao responsável
                    <textarea
                      required
                      maxLength={6000}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Responder pelo Samuca
                  </button>
                </form>
                {manager && thread.status === "answered" && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setTab("knowledge");
                      setEditing("");
                      setQuestion(thread.question);
                      setAnswer("");
                      setConfirmed(false);
                    }}
                  >
                    Preparar uma orientação geral a partir desta dúvida
                  </button>
                )}
              </>
            ) : (
              <p>
                Escolha uma pergunta para atender. O Samuca apresenta o retorno
                na conversa do responsável.
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="serviceColumns">
          <section className="panel serviceForm">
            <h2>
              {editing ? "Revisar orientação" : "Publicar orientação geral"}
            </h2>
            <p>
              Não copie registros de alunos, dados financeiros ou mensagens
              particulares. Escreva uma orientação geral e defina o público.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(true);
              }}
            >
              <label>
                Pergunta ou assunto
                <input
                  required
                  maxLength={1000}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </label>
              <label>
                Resposta aprovada
                <textarea
                  required
                  maxLength={6000}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </label>
              <label>
                Unidade
                <select
                  value={unitId}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    setClass("");
                  }}
                >
                  <option value="">Todas as unidades da escola</option>
                  {data.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Turma
                <select
                  value={classId}
                  onChange={(e) => setClass(e.target.value)}
                >
                  <option value="">Todas as turmas do escopo</option>
                  {data.classes
                    .filter((c) => !unitId || c.unitId === unitId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ·{" "}
                        {data.units.find((u) => u.id === c.unitId)?.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Válida até (opcional)
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{" "}
                Revisei o texto: é uma orientação geral, sem dados particulares.
              </label>
              <button className="primary" disabled={busy}>
                Aprovar e publicar
              </button>
              {editing && (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || !confirmed}
                  onClick={() => void save(false)}
                >
                  Desativar orientação
                </button>
              )}
            </form>
          </section>
          <section className="panel">
            <h2>Base de conhecimento</h2>
            <p>
              Busca textual com fontes, escopo e validade. Respostas
              particulares nunca são aprendidas automaticamente.
            </p>
            {data.knowledge.map((k) => (
              <button
                className="serviceItem"
                key={k.id}
                onClick={() => {
                  setEditing(k.id);
                  setQuestion(k.question);
                  setAnswer(k.answer);
                  setUnit(k.unitIds[0] || "");
                  setClass(k.classIds[0] || "");
                  setExpiry(k.expiresAt);
                  setConfirmed(false);
                }}
              >
                <strong>{k.question}</strong>
                <span>
                  {k.active ? "Publicada" : "Desativada"} · revisão{" "}
                  {new Date(k.reviewedAt).toLocaleDateString("pt-BR")}
                </span>
              </button>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
