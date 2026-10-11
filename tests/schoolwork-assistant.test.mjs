import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  applyCommand,
  visibleState,
} from "../packages/core/model.mjs";
import {
  consultAssistant,
  retrieveKnowledge,
} from "../packages/core/assistant.mjs";
const now = "2026-10-10T15:00:00Z";
const file = {
  name: "documento.pdf",
  uri: "data:application/pdf;base64,JVBERg==",
  mimeType: "application/pdf",
};
const setup = () => {
  const state = createSeed();
  const family = state.actors.find((a) => a.id === "rafael");
  const teacher = state.actors.find((a) => a.id === "ana");
  teacher.classIds = ["jardim"];
  const admin = state.actors.find((a) => a.role === "administrator");
  return { state, family, teacher, admin };
};
const ask = (state, family, question, childId = "lia") =>
  applyCommand(
    state,
    family,
    { type: "assistant.ask", childId, question },
    now,
  );
test("atividades: turma vinculada, destinatários mistos rejeitados e calendário privado", () => {
  const { state, family, teacher } = setup();
  const command = {
    type: "assignment.create",
    kind: "exam",
    due: "2026-10-20",
    time: "09:00",
    title: "Prova",
    description: "Em sala",
    syllabus: "Formas",
    childIds: ["lia", "bento"],
  };
  assert.throws(() => applyCommand(state, teacher, command, now), /vínculo/);
  assert.equal(state.assignments.length, 3);
  const next = applyCommand(
    state,
    teacher,
    { ...command, childIds: ["lia", "miguel"] },
    now,
  );
  assert.deepEqual(visibleState(next, family).assignments[0].childIds, ["lia"]);
  assert.equal(
    visibleState(next, teacher).assignments.some((w) =>
      w.childIds.includes("bento"),
    ),
    false,
  );
});
test("entrega familiar e retorno docente preservam registro e impedem alteração após avaliação", () => {
  const { state, family, teacher } = setup();
  const submitted = applyCommand(
    state,
    family,
    {
      type: "assignment.submit",
      assignmentId: "w-home",
      childId: "lia",
      note: "Entregue",
      attachment: file,
    },
    now,
  );
  const reviewed = applyCommand(
    submitted,
    teacher,
    {
      type: "assignment.feedback",
      assignmentId: "w-home",
      childId: "lia",
      feedback: "Muito bem",
    },
    now,
  );
  assert.equal(reviewed.assignments[0].submissions[0].reviewedBy, teacher.id);
  assert.throws(
    () =>
      applyCommand(
        reviewed,
        family,
        {
          type: "assignment.submit",
          assignmentId: "w-home",
          childId: "lia",
          note: "Mudança",
        },
        now,
      ),
    /avaliada/,
  );
  assert.throws(
    () =>
      applyCommand(
        state,
        family,
        {
          type: "assignment.submit",
          assignmentId: "w-exam",
          childId: "lia",
          note: "Prova",
        },
        now,
      ),
    /escola/,
  );
  assert.throws(
    () =>
      applyCommand(
        state,
        family,
        {
          type: "assignment.submit",
          assignmentId: "w-home",
          childId: "miguel",
          note: "Entregue",
        },
        now,
      ),
    /vínculo/,
  );
  assert.equal(
    JSON.stringify(submitted.audit.at(-1)).includes("JVBERg=="),
    false,
  );
});
test("solicitações: tipo exige anexo no servidor, snapshot e histórico privado", () => {
  const { state, family, teacher, admin } = setup();
  const command = {
    type: "request.create",
    requestTypeId: "rt-update",
    childId: "lia",
    body: "Atualizar endereço",
  };
  assert.throws(() => applyCommand(state, family, command, now), /anexo/);
  const next = applyCommand(
    state,
    family,
    { ...command, attachment: file },
    now,
  );
  const ticket = next.requests[0];
  const other = { ...family, id: "another", name: "Outro responsável" };
  next.actors.push(other);
  assert.equal(visibleState(next, other).requests.length, 0);
  assert.equal(visibleState(next, teacher).requests.length, 0);
  assert.throws(
    () =>
      applyCommand(
        next,
        other,
        { type: "request.reply", requestId: ticket.id, body: "Acesso" },
        now,
      ),
    /vínculo/,
  );
  const changed = applyCommand(
    next,
    admin,
    {
      type: "requestType.save",
      requestTypeId: "rt-update",
      name: "Novo nome",
      description: "Outra orientação",
      attachmentRequired: false,
      active: false,
    },
    now,
  );
  assert.equal(changed.requests[0].typeName, "Atualização cadastral");
  assert.equal(changed.requests[0].attachmentRequired, true);
  assert.throws(
    () => applyCommand(changed, family, command, now),
    /indisponível/,
  );
  const closed = applyCommand(
    changed,
    admin,
    { type: "request.status", requestId: ticket.id, status: "closed" },
    now,
  );
  assert.throws(
    () =>
      applyCommand(
        closed,
        family,
        { type: "request.reply", requestId: ticket.id, body: "Olá" },
        now,
      ),
    /encerrada/,
  );
});
test("anexos inválidos não entram na solicitação nem na atividade", () => {
  const { state, family } = setup();
  for (const uri of [
    "https://example.org/file.pdf",
    "data:text/html;base64,JVBERg==",
    "data:application/pdf;base64,invalid",
  ])
    assert.throws(
      () =>
        applyCommand(
          state,
          family,
          {
            type: "request.create",
            requestTypeId: "rt-update",
            childId: "lia",
            body: "Documento",
            attachment: { ...file, uri },
          },
          now,
        ),
      /Anex|anexo/,
    );
});
test("Samuca: faturas consolidadas, reais em centavos e fonte identificada", () => {
  const { state, family } = setup();
  const next = ask(state, family, "Tenho faturas em aberto?");
  const t = next.assistantThreads[0];
  assert.equal(t.status, "answered");
  assert.match(t.messages[1].body, /2\.600,00/);
  assert.equal(t.sources.length, 2);
  assert.equal(t.tool, "family_invoices");
  assert.equal(next.audit.at(-1).type, "assistant.ask");
});
test("Samuca: rotina publicada, fonte datada, sem tempo real ou exposição de rascunhos", () => {
  const { state, family } = setup();
  const view = visibleState(state, family);
  const answer = consultAssistant(
    view,
    "Como foi o dia em 09/10/2026?",
    "lia",
    now,
  );
  assert.match(answer.answer, /última informação publicada/);
  assert.equal(answer.sources[0].id, "r-lia");
  state.routines[0].published = false;
  assert.equal(
    consultAssistant(
      visibleState(state, family),
      "Como foi o dia em 09/10/2026?",
      "lia",
      now,
    ).answer,
    null,
  );
});
test("Samuca: prova na data tem conteúdo programático e orientação docente", () => {
  const { state, family } = setup();
  const answer = consultAssistant(
    visibleState(state, family),
    "O que vai cair na prova de 20/10/2026?",
    "lia",
    now,
  );
  assert.match(answer.answer, /Reconhecimento de cores/);
  assert.equal(answer.sources[0].id, "w-exam");
});
test("Samuca: calendário vazio ou evento não comprovam aula; encaminhamento e retorno privado", () => {
  const { state, family, teacher, admin } = setup();
  const next = ask(state, family, "Vai ter aula em 12/10/2026?");
  const t = next.assistantThreads[0];
  assert.equal(t.status, "waiting");
  assert.equal(t.department, "secretary");
  assert.equal(visibleState(next, teacher).assistantThreads.length, 0);
  const reply = applyCommand(
    next,
    admin,
    {
      type: "assistant.reply",
      threadId: t.id,
      body: "Não haverá aula por causa do feriado.",
    },
    now,
  );
  assert.equal(
    visibleState(reply, family).assistantThreads[0].status,
    "answered",
  );
  assert.equal(reply.knowledge.length, 0);
  assert.match(reply.assistantThreads[0].messages.at(-1).body, /feriado/);
});
test("Samuca: professor não atende outra turma nem consultas de financeiro", () => {
  const { state, family, teacher } = setup();
  let next = ask(state, family, "Como foi o dia em 15/10/2026?", "bento");
  assert.equal(next.assistantThreads[0].department, "teacher");
  assert.equal(visibleState(next, teacher).assistantThreads.length, 0);
  assert.throws(
    () =>
      applyCommand(
        next,
        teacher,
        {
          type: "assistant.reply",
          threadId: next.assistantThreads[0].id,
          body: "Resposta",
        },
        now,
      ),
    /vínculo/,
  );
  family.financial = false;
  next = ask(state, family, "Tenho faturas em aberto?");
  assert.equal(next.assistantThreads[0].department, "finance");
  assert.equal(visibleState(next, teacher).assistantThreads.length, 0);
});
test("Samuca: vínculo de família e sessão adulterada não ampliam acesso", () => {
  const { state, family } = setup();
  assert.throws(
    () => ask(state, family, "Como foi o dia?", "miguel"),
    /vínculo/,
  );
  assert.throws(
    () =>
      ask(
        state,
        { ...family, childIds: ["miguel"], role: "administrator" },
        "Como foi o dia?",
        "miguel",
      ),
    /vínculo/,
  );
});
test("conhecimento exige aprovação explícita, validade e escopo; resposta privada não vira aprendizado", () => {
  const { state, family, teacher, admin } = setup();
  const entry = {
    type: "knowledge.save",
    question: "Haverá aula no feriado de 12/10/2026?",
    answer: "Não haverá aula em 12/10/2026. As aulas retornam em 13/10.",
    active: true,
    unitIds: ["central"],
    classIds: ["jardim"],
    expiresAt: "2026-10-13",
  };
  assert.throws(() => applyCommand(state, admin, entry, now), /Confirme/);
  assert.throws(
    () =>
      applyCommand(state, teacher, { ...entry, generalConfirmed: true }, now),
    /permissão/,
  );
  const next = applyCommand(
    state,
    admin,
    { ...entry, generalConfirmed: true },
    now,
  );
  assert.equal(
    retrieveKnowledge(
      visibleState(next, family),
      "Haverá aula no feriado de 12/10/2026?",
      "lia",
      now,
    ).length,
    1,
  );
  assert.equal(
    retrieveKnowledge(visibleState(next, family), entry.question, "bento", now)
      .length,
    0,
  );
  assert.equal(
    retrieveKnowledge(
      visibleState(next, family),
      entry.question,
      "lia",
      "2026-10-14T00:00:00Z",
    ).length,
    0,
  );
  const answered = ask(next, family, entry.question);
  assert.equal(answered.assistantThreads[0].sources[0].kind, "knowledge");
  assert.equal(answered.assistantThreads[0].status, "answered");
});

test("Samuca não responde rotina de um nome diferente como se fosse o aluno selecionado", () => {
  const { state, family } = setup();
  const response = consultAssistant(
    visibleState(state, family),
    "Como foi o dia do Miguel?",
    "lia",
    now,
  );
  assert.equal(response.tool, "student_context");
  assert.match(response.answer, /Só posso consultar alunos vinculados/);
  assert.equal(response.sources.length, 0);
});

test("revogação financeira oculta respostas históricas com valores e conhecimento global não pode ser alterado por coordenação restrita", () => {
  const { state, family, admin } = setup();
  let next = ask(state, family, "Tenho faturas em aberto?");
  next.actors.find((a) => a.id === family.id).financial = false;
  assert.equal(visibleState(next, family).assistantThreads.length, 0);
  next = applyCommand(
    next,
    admin,
    {
      type: "knowledge.save",
      question: "Horário de atendimento",
      answer: "A secretaria atende das 8h às 17h.",
      active: true,
      generalConfirmed: true,
      unitIds: [],
      classIds: [],
    },
    now,
  );
  const scoped = next.actors.find((a) => a.role === "coordinator");
  scoped.unitIds = ["central"];
  assert.throws(
    () =>
      applyCommand(
        next,
        scoped,
        {
          type: "knowledge.save",
          knowledgeId: next.knowledge[0].id,
          question: "Horário",
          answer: "Alterado",
          active: true,
          generalConfirmed: true,
          unitIds: ["central"],
          classIds: [],
        },
        now,
      ),
    /fora do seu acesso/,
  );
});
