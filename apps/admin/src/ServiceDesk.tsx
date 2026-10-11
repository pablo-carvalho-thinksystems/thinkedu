import React, { useState } from "react";
import type {
  VisibleStore,
  Attachment,
} from "../../../packages/core/model.mjs";
import { can } from "../../../packages/core/permissions.mjs";
const statuses: Record<string, string> = {
  open: "Aberta",
  in_progress: "Em atendimento",
  waiting: "Aguardando retorno",
  closed: "Encerrada",
};
const labels: Record<string, string> = {
  homework: "Para casa",
  project: "Trabalho",
  exam: "Prova",
};
export function ServiceDesk({
  mode,
  data,
  busy,
  dispatch,
}: {
  mode: "requests" | "assignments";
  data: VisibleStore;
  busy: boolean;
  dispatch: (c: Record<string, unknown>) => Promise<boolean>;
}) {
  const [tab, setTab] = useState("requests"),
    [selected, setSelected] = useState(""),
    [editing, setEditing] = useState(""),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [required, setRequired] = useState(false),
    [active, setActive] = useState(true),
    [reply, setReply] = useState(""),
    [status, setStatus] = useState("open"),
    [creating, setCreating] = useState(false),
    [title, setTitle] = useState(""),
    [syllabus, setSyllabus] = useState(""),
    [kind, setKind] = useState("homework"),
    [due, setDue] = useState(""),
    [time, setTime] = useState("08:00"),
    [classId, setClass] = useState(data.classes[0]?.id || ""),
    [attachment, setAttachment] = useState<Attachment | null>(null),
    [fileError, setFileError] = useState("");
  const actor = data.currentActor,
    ticket = data.requests.find((r) => r.id === selected),
    work = data.assignments.find((w) => w.id === selected);
  const date = (v: string) => new Date(v).toLocaleString("pt-BR");
  async function file(event: React.ChangeEvent<HTMLInputElement>) {
    setFileError("");
    const f = event.target.files?.[0];
    if (!f) {
      setAttachment(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("Selecione um arquivo de até 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setAttachment({
        name: f.name,
        mimeType: f.type,
        uri: String(reader.result),
      });
    reader.onerror = () => setFileError("Não foi possível ler o arquivo.");
    reader.readAsDataURL(f);
  }
  function fileInput() {
    return (
      <label>
        Anexo (até 5 MB)
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,text/plain,.docx"
          onChange={file}
        />
        {attachment && <small>{attachment.name}</small>}
        {fileError && <small role="alert">{fileError}</small>}
      </label>
    );
  }
  if (mode === "assignments")
    return (
      <div className="serviceDesk">
        {creating ? (
          <section className="panel serviceForm">
            <h2>Publicar atividade para a turma</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await dispatch({
                    type: "assignment.create",
                    kind,
                    title,
                    description,
                    syllabus,
                    due,
                    time,
                    childIds: data.children
                      .filter((c) => c.classId === classId)
                      .map((c) => c.id),
                    attachment,
                  })
                ) {
                  setCreating(false);
                  setAttachment(null);
                }
              }}
            >
              <div className="formGrid">
                <label>
                  Turma
                  <select
                    value={classId}
                    onChange={(e) => setClass(e.target.value)}
                    required
                  >
                    {data.classes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ·{" "}
                        {data.units.find((u) => u.id === g.unitId)?.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    {Object.entries(labels).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Título
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  Data ou prazo
                  <input
                    type="date"
                    required
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </label>
                <label>
                  Horário
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
                {fileInput()}
              </div>
              <label>
                Orientação do professor
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label>
                Conteúdo programático
                <textarea
                  required
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                />
              </label>
              <div className="actions">
                <button className="primary" disabled={busy}>
                  Publicar atividade
                </button>
                <button type="button" onClick={() => setCreating(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        ) : work ? (
          <section className="panel serviceForm">
            <button onClick={() => setSelected("")}>← Atividades</button>
            <small>
              {labels[work.kind]} · {work.due} · {work.time}
            </small>
            <h2>{work.title}</h2>
            <h3>Orientação do professor</h3>
            <p>{work.description}</p>
            <h3>Conteúdo programático</h3>
            <p>{work.syllabus}</p>
            {work.attachment && (
              <a
                className="primary"
                href={work.attachment.uri}
                download={work.attachment.name}
              >
                Baixar material
              </a>
            )}
            <h3>Entregas por aluno</h3>
            {work.childIds.map((id) => {
              const c = data.children.find((c) => c.id === id),
                submission = work.submissions.find((s) => s.childId === id);
              return (
                <div key={id} className="serviceThread">
                  <strong>
                    {c?.name} · {c?.group}
                  </strong>
                  <p>
                    {work.kind === "exam"
                      ? "Prova na escola"
                      : submission
                        ? `Entregue em ${date(submission.submittedAt)}`
                        : "Entrega pendente"}
                  </p>
                  {submission && (
                    <>
                      <p>{submission.note}</p>
                      {submission.attachment && (
                        <a
                          href={submission.attachment.uri}
                          download={submission.attachment.name}
                        >
                          Baixar entrega
                        </a>
                      )}
                      {submission.feedback ? (
                        <p>
                          <b>Retorno:</b> {submission.feedback}
                        </p>
                      ) : (
                        can(actor, "assignments.write") && (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const form = new FormData(e.currentTarget);
                              await dispatch({
                                type: "assignment.feedback",
                                assignmentId: work.id,
                                childId: id,
                                feedback: form.get("feedback"),
                              });
                            }}
                          >
                            <label>
                              Retorno para {c?.name}
                              <textarea required name="feedback" />
                            </label>
                            <button className="primary" disabled={busy}>
                              Registrar retorno
                            </button>
                          </form>
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </section>
        ) : (
          <>
            <div className="serviceToolbar">
              <p>
                Para casa, trabalhos e provas · prazos e orientações por turma.
              </p>
              {can(actor, "assignments.write") && (
                <button
                  className="primary"
                  onClick={() => {
                    setSelected("");
                    setCreating(true);
                    setDescription("");
                    setAttachment(null);
                  }}
                >
                  Nova atividade
                </button>
              )}
            </div>
            <div className="unitGrid">
              {data.assignments.map((w) => (
                <button
                  className="panel serviceCard"
                  key={w.id}
                  onClick={() => setSelected(w.id)}
                >
                  <small>
                    {labels[w.kind]} · {w.due} · {w.time}
                  </small>
                  <h2>{w.title}</h2>
                  <p>{w.description}</p>
                  <strong>
                    {w.childIds.length} alunos · {w.submissions.length} entregas
                  </strong>
                  <span>Ver conteúdo e entregas →</span>
                </button>
              ))}
            </div>
            {!data.assignments.length && <p>Nenhuma atividade publicada.</p>}
          </>
        )}
      </div>
    );
  return (
    <div className="serviceDesk">
      <div className="tabs">
        <button
          className={tab === "requests" ? "selected" : ""}
          onClick={() => {
            setTab("requests");
            setSelected("");
          }}
        >
          Atendimentos <span>{data.requests.length}</span>
        </button>
        {can(actor, "requests.configure") && (
          <button
            className={tab === "types" ? "selected" : ""}
            onClick={() => setTab("types")}
          >
            Tipos de solicitação
          </button>
        )}
      </div>
      {tab === "types" ? (
        <div className="unitGrid">
          <section className="panel serviceForm">
            <h2>{editing ? "Editar tipo" : "Novo tipo de solicitação"}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await dispatch({
                    type: "requestType.save",
                    requestTypeId: editing || undefined,
                    name,
                    description,
                    attachmentRequired: required,
                    active,
                  })
                ) {
                  setEditing("");
                  setName("");
                  setDescription("");
                  setRequired(false);
                  setActive(true);
                }
              }}
            >
              <label>
                Nome do tipo
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex.: Declaração de matrícula"
                />
              </label>
              <label>
                Orientação para o responsável
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </label>
              <label className="classCheck">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                Exigir anexo
              </label>
              <label className="classCheck">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Disponível para responsáveis
              </label>
              <button className="primary" disabled={busy}>
                Salvar tipo de solicitação
              </button>
            </form>
          </section>
          <section className="panel serviceForm">
            <h2>Tipos cadastrados</h2>
            {data.requestTypes.map((t) => (
              <button
                className="serviceType"
                key={t.id}
                onClick={() => {
                  setEditing(t.id);
                  setName(t.name);
                  setDescription(t.description);
                  setRequired(t.attachmentRequired);
                  setActive(t.active);
                }}
              >
                <strong>{t.name}</strong>
                <span>
                  {t.active ? "Disponível" : "Desativado"} ·{" "}
                  {t.attachmentRequired
                    ? "Anexo obrigatório"
                    : "Anexo opcional"}
                </span>
                <small>{t.description}</small>
              </button>
            ))}
          </section>
        </div>
      ) : ticket ? (
        <section className="panel serviceForm">
          <button onClick={() => setSelected("")}>← Atendimentos</button>
          <small>
            {ticket.protocol} · {statuses[ticket.status]}
          </small>
          <h2>{ticket.typeName}</h2>
          <p>
            {data.children.find((c) => c.id === ticket.childId)?.name} · aberto
            em {date(ticket.createdAt)}
          </p>
          {ticket.messages.map((m) => (
            <div className="serviceThread" key={m.id}>
              <strong>
                {data.actors.find((a) => a.id === m.senderId)?.name ||
                  "Responsável"}{" "}
                · {date(m.at)}
              </strong>
              <p>{m.body}</p>
              {m.attachment && (
                <a href={m.attachment.uri} download={m.attachment.name}>
                  Baixar anexo · {m.attachment.name}
                </a>
              )}
            </div>
          ))}
          {ticket.status !== "closed" && can(actor, "requests.manage") && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await dispatch({
                    type: "request.reply",
                    requestId: ticket.id,
                    body: reply,
                    attachment,
                  })
                ) {
                  setReply("");
                  setAttachment(null);
                }
              }}
            >
              <label>
                Resposta da escola
                <textarea
                  required
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
              </label>
              {fileInput()}
              <button className="primary" disabled={busy}>
                Enviar resposta
              </button>
            </form>
          )}
          {can(actor, "requests.manage") && (
            <div className="serviceToolbar">
              <label>
                Status do atendimento
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {Object.entries(statuses).map(([k, l]) => (
                    <option value={k} key={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary"
                disabled={busy || status === ticket.status}
                onClick={() =>
                  void dispatch({
                    type: "request.status",
                    requestId: ticket.id,
                    status,
                  })
                }
              >
                Atualizar status
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="serviceToolbar">
            <p>
              Pedidos e conversas dos responsáveis, com protocolo e histórico.
            </p>
            <label>
              Filtrar status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Todos</option>
                {Object.entries(statuses).map(([k, l]) => (
                  <option value={k} key={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="unitGrid">
            {data.requests
              .filter((r) => status === "all" || r.status === status)
              .map((r) => (
                <button
                  className="panel serviceCard"
                  key={r.id}
                  onClick={() => {
                    setSelected(r.id);
                    setStatus(r.status);
                    setReply("");
                    setAttachment(null);
                  }}
                >
                  <small>
                    {r.protocol} · {statuses[r.status]}
                  </small>
                  <h2>{r.typeName}</h2>
                  <p>
                    {data.children.find((c) => c.id === r.childId)?.name} ·{" "}
                    {date(r.updatedAt)}
                  </p>
                  <strong>{r.messages.length} mensagens</strong>
                  <span>Abrir atendimento →</span>
                </button>
              ))}
          </div>
          {!data.requests.length && (
            <section className="panel serviceForm">
              <h2>Todos os pedidos, no mesmo lugar.</h2>
              <p>
                Os responsáveis poderão escolher os tipos disponibilizados pela
                escola. Configure quais pedidos exigem anexo na aba Tipos de
                solicitação.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
