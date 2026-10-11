import { can } from "./permissions.mjs";
const normalize = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const stop = new Set(
  "a o de da do das dos e em no na um uma tem vai para por me se que posso pode dizer saber como esta ser dia".split(
    " ",
  ),
);
const words = (s) =>
  [...new Set(normalize(s).match(/[a-z0-9]+/g) || [])].filter(
    (t) => (t.length > 2 || /^\d+$/.test(t)) && !stop.has(t),
  );
export const assistantDepartments = {
  teacher: "Professor(a)",
  finance: "Financeiro",
  secretary: "Secretaria",
  coordinator: "Coordenação",
  director: "Diretoria",
};
export function retrieveKnowledge(view, query, childId, now) {
  const child = view.children.find((c) => c.id === childId),
    terms = words(query);
  if (!terms.length) return [];
  const numbers = normalize(query).match(/\d+/g) || [];
  return view.knowledge
    .filter(
      (k) =>
        numbers.every((n) =>
          (normalize(k.question + " " + k.answer).match(/\d+/g) || []).includes(
            n,
          ),
        ) &&
        k.active &&
        (!k.expiresAt || k.expiresAt >= now.slice(0, 10)) &&
        (!k.unitIds.length || k.unitIds.includes(child?.unitId)) &&
        (!k.classIds.length || k.classIds.includes(child?.classId)),
    )
    .map((k) => {
      const title = words(k.question);
      const all = words(k.question + " " + k.answer);
      const matches = terms.filter((t) => all.includes(t));
      return {
        ...k,
        score:
          matches.length / terms.length +
          (terms.filter((t) => title.includes(t)).length / terms.length) * 0.25,
      };
    })
    .filter((k) => k.score >= 0.7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
function dateFrom(query, now) {
  const iso = query.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const pt = query.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (pt)
    return `${pt[3] || now.slice(0, 4)}-${pt[2].padStart(2, "0")}-${pt[1].padStart(2, "0")}`;
  const n = normalize(query);
  if (/hoje|agora|sendo/.test(n))
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date(now));
  return null;
}
export function consultAssistant(
  view,
  query,
  childId,
  now = new Date().toISOString(),
) {
  const q = normalize(query),
    child = view.children.find((c) => c.id === childId);
  if (!child)
    throw Object.assign(Error("Aluno sem vínculo autorizado."), {
      status: 403,
    });
  const named = q.match(/dia (?:do|da|de) ([a-z]+)\b/)?.[1];
  if (
    named &&
    ![
      "hoje",
      "ontem",
      "amanha",
      "segunda",
      "terca",
      "quarta",
      "quinta",
      "sexta",
      "sabado",
      "domingo",
    ].includes(named) &&
    !normalize(child.name).split(" ").includes(named)
  )
    return {
      answer: `Esta conversa está vinculada a ${child.name}. Selecione o filho desejado antes de consultar a rotina. Só posso consultar alunos vinculados ao seu acesso.`,
      sources: [],
      tool: "student_context",
      department: null,
    };
  const result = (answer, sources, tool) => ({
    answer,
    sources,
    tool,
    department: null,
  });
  if (/fatura|mensalidade|boleto|cobranc|financeir/.test(q)) {
    if (!can(view.currentActor, "finance.read"))
      return {
        answer: null,
        sources: [],
        tool: "family_invoices",
        department: "finance",
      };
    const bills = view.invoices.filter((i) => i.status !== "paid");
    return result(
      bills.length
        ? `Há ${bills.length} cobrança(s) em aberto para a família, no total de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(bills.reduce((s, b) => s + b.amount, 0) / 100)}.\n` +
            bills
              .map(
                (b) =>
                  `${b.description || "Mensalidade"} · ${view.children.find((c) => c.id === b.childId)?.name || "Aluno"} · vencimento ${b.due} · ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(b.amount / 100)}`,
              )
              .join("\n")
        : "Não há cobranças em aberto nos registros disponíveis da sua família.",
      bills.map((b) => ({
        kind: "invoice",
        id: b.id,
        label: "Financeiro · " + b.due,
      })),
      "family_invoices",
    );
  }
  const date = dateFrom(q, now);
  if (/prova|avaliacao|trabalho|para casa|conteudo programatico/.test(q)) {
    const kind = /prova|avaliacao/.test(q)
      ? "exam"
      : /trabalho/.test(q)
        ? "project"
        : "homework";
    const work = view.assignments
      .filter(
        (w) =>
          w.childIds.includes(childId) &&
          w.kind === kind &&
          (!date || w.due === date),
      )
      .sort((a, b) => a.due.localeCompare(b.due));
    if (work.length)
      return result(
        work
          .slice(0, 4)
          .map(
            (w) =>
              `${w.title}\nData: ${w.due}, às ${w.time}.\nConteúdo: ${w.syllabus}\nOrientação do professor: ${w.description}`,
          )
          .join("\n\n"),
        work
          .slice(0, 4)
          .map((w) => ({ kind: "assignment", id: w.id, label: w.title })),
        "student_assignments",
      );
  }
  if (/como.*dia|rotina|aliment|dorm|sono|humor/.test(q)) {
    const routines = view.routines
      .filter(
        (r) =>
          r.childId === childId && r.published && (!date || r.date === date),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    const r = routines[0];
    if (r)
      return result(
        `Registro publicado de ${child.name} em ${r.date}, atualizado em ${r.updatedAt}.\nAlimentação: ${r.meal}. Sono: ${r.sleep} minutos. Higiene: ${r.hygiene}. Humor: ${r.mood}.\n${r.note}\nEsta é a última informação publicada para essa data; não representa acompanhamento em tempo real.`,
        [{ kind: "routine", id: r.id, label: "Rotina · " + r.date }],
        "student_routine",
      );
  }
  if (/calendario|evento|aula|feriado|recesso/.test(q) && date) {
    const events = view.events.filter(
      (e) => e.childIds.includes(childId) && e.date === date,
    );
    // An event is not evidence that classes run; no calendar entry is not evidence of a day off.
    if (
      events.length &&
      !/vai ter aula|havera aula|tem aula|nao.*aula|sem aula/.test(q)
    )
      return result(
        events
          .map((e) => `${e.title} · ${e.date} às ${e.time} · ${e.place}`)
          .join("\n"),
        events.map((e) => ({ kind: "event", id: e.id, label: e.title })),
        "student_calendar",
      );
  }
  const hits = retrieveKnowledge(view, query, childId, now);
  if (
    hits.length &&
    (hits.length === 1 || hits[0].score > hits[1].score + 0.15)
  )
    return result(
      hits[0].answer,
      [{ kind: "knowledge", id: hits[0].id, label: hits[0].question }],
      "school_knowledge",
    );
  const department = /diretor|direcao/.test(q)
    ? "director"
    : /prova|avaliacao|pedagog|aprendiz/.test(q)
      ? "coordinator"
      : /dia|rotina|professor|atividade|trabalho|para casa|aliment|sono/.test(q)
        ? "teacher"
        : "secretary";
  return { answer: null, sources: [], tool: "school_knowledge", department };
}
export function applyAssistant(
  next,
  actor,
  command,
  now,
  id,
  requireChild,
  text,
  fail,
  view,
  trustedAnswer,
) {
  if (command.type === "assistant.ask") {
    if (actor.role !== "family")
      fail("O assistente atende os responsáveis.", 403);
    requireChild(command.childId);
    const query = text(command.question, 2000);
    const found =
      trustedAnswer || consultAssistant(view, query, command.childId, now);
    const thread = {
      id: id(),
      actorId: actor.id,
      childId: command.childId,
      question: query,
      status: found.answer ? "answered" : "waiting",
      department: found.department,
      createdAt: now,
      updatedAt: now,
      tool: found.tool,
      engine: found.engine || "local",
      model: found.model || null,
      providerUnavailable: found.providerUnavailable || false,
      sources: found.sources,
      messages: [
        { id: id(), senderId: actor.id, body: query, at: now },
        {
          id: id(),
          senderId: "samuca",
          body:
            found.answer ||
            `Ainda não encontrei uma resposta confirmada. Encaminhei sua pergunta para ${assistantDepartments[found.department]}. Assim que a escola responder, o retorno aparecerá nesta conversa.`,
          at: now,
        },
      ],
    };
    next.assistantThreads.unshift(thread);
  } else if (command.type === "assistant.reply") {
    const thread = next.assistantThreads.find((t) => t.id === command.threadId);
    if (!thread) fail("Conversa não encontrada.", 404);
    requireChild(thread.childId);
    if (
      !can(actor, "assistant.manage") ||
      !view.assistantThreads.some((t) => t.id === thread.id)
    )
      fail("Atendimento sem vínculo autorizado.", 403);
    const body = text(command.body, 6000);
    thread.messages.push(
      { id: id(), senderId: actor.id, body, at: now },
      {
        id: id(),
        senderId: "samuca",
        body: `Recebi o retorno da escola:\n${body}`,
        at: now,
      },
    );
    thread.status = "answered";
    thread.updatedAt = now;
    thread.repliedBy = actor.id;
  } else if (command.type === "knowledge.save") {
    if (!can(actor, "knowledge.manage"))
      fail("Sem permissão para revisar o conhecimento.", 403);
    if (typeof command.active !== "boolean") fail("Revise a publicação.");
    const unitIds = command.unitIds || [],
      classIds = command.classIds || [];
    if (
      !Array.isArray(unitIds) ||
      !Array.isArray(classIds) ||
      unitIds.some((u) => !view.units.some((v) => v.id === u)) ||
      classIds.some((c) => !view.classes.some((v) => v.id === c))
    )
      fail("Escopo não autorizado.", 403);
    if (actor.unitIds && !unitIds.length)
      fail("Selecione as unidades autorizadas para publicar.", 403);
    const old =
      command.knowledgeId &&
      next.knowledge.find((k) => k.id === command.knowledgeId);
    if (command.knowledgeId && !old) fail("Conhecimento não encontrado.", 404);
    if (
      old &&
      actor.unitIds &&
      (!old.unitIds.length ||
        old.unitIds.some((u) => !actor.unitIds.includes(u)) ||
        old.classIds.some((c) => !view.classes.some((v) => v.id === c)))
    )
      fail(
        "Você não pode alterar uma orientação que abrange unidades fora do seu acesso.",
        403,
      );
    if (old && !view.knowledge.some((k) => k.id === old.id))
      fail("Conhecimento sem vínculo autorizado.", 403);
    if (command.generalConfirmed !== true)
      fail(
        "Confirme que a orientação é geral e não contém dados particulares.",
      );
    const expiresAt = command.expiresAt || "";
    if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt))
      fail("Validade inválida.");
    const values = {
      question: text(command.question, 1000),
      answer: text(command.answer, 6000),
      unitIds: [...new Set(unitIds)],
      classIds: [...new Set(classIds)],
      active: command.active,
      expiresAt,
      reviewedBy: actor.id,
      reviewedAt: now,
    };
    if (old) Object.assign(old, values);
    else next.knowledge.push({ id: id(), ...values });
  } else return false;
  return true;
}
