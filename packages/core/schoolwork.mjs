export const assignmentKinds = {
  homework: "Para casa",
  project: "Trabalho",
  exam: "Prova",
};
export function seedAssignments() {
  return [
    {
      id: "w-home",
      kind: "homework",
      title: "As formas que encontramos em casa",
      description:
        "Com ajuda da família, encontre três objetos de formas diferentes. Desenhe os objetos e traga o registro para nossa roda.",
      syllabus:
        "Formas geométricas: círculo, quadrado e triângulo. Observação e expressão por desenho.",
      due: "2026-10-13",
      time: "08:00",
      childIds: ["lia", "miguel", "alice"],
      authorId: "ana",
      attachment: null,
      createdAt: "2026-10-09T12:00:00Z",
      submissions: [],
    },
    {
      id: "w-project",
      kind: "project",
      title: "Meu pequeno jardim",
      description:
        "Prepare um desenho ou uma fotografia de uma planta da sua casa. Vamos compartilhar o que observamos sobre suas folhas.",
      syllabus: "Natureza, cuidado com plantas e linguagem oral.",
      due: "2026-10-16",
      time: "08:00",
      childIds: ["bento"],
      authorId: "ana",
      attachment: null,
      createdAt: "2026-10-09T12:00:00Z",
      submissions: [],
    },
    {
      id: "w-exam",
      kind: "exam",
      title: "Encontro de avaliação: cores e formas",
      description:
        "Atividade de avaliação lúdica em sala. Não é necessário entregar material. A professora acompanhará os conhecimentos de cada criança.",
      syllabus:
        "Reconhecimento de cores, classificação de objetos e identificação de formas.",
      due: "2026-10-20",
      time: "09:00",
      childIds: ["lia", "miguel", "alice"],
      authorId: "ana",
      attachment: null,
      createdAt: "2026-10-09T12:00:00Z",
      submissions: [],
    },
  ];
}
export function seedRequestTypes() {
  return [
    {
      id: "rt-declaration",
      name: "Declaração de matrícula",
      description: "Solicite uma declaração de matrícula para o aluno.",
      attachmentRequired: false,
      active: true,
    },
    {
      id: "rt-update",
      name: "Atualização cadastral",
      description:
        "Informe o dado que precisa ser atualizado e anexe o documento comprobatório.",
      attachmentRequired: true,
      active: true,
    },
    {
      id: "rt-secretary",
      name: "Atendimento da secretaria",
      description: "Envie sua dúvida ou solicitação à secretaria.",
      attachmentRequired: false,
      active: true,
    },
  ];
}
export function validateSchoolAttachment(value, fail) {
  if (!value) return null;
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 160 ||
    typeof value.uri !== "string"
  )
    fail("Anexo inválido.");
  const m = value.uri.match(
    /^data:(application\/pdf|image\/png|image\/jpeg|text\/plain|application\/vnd.openxmlformats-officedocument.wordprocessingml.document);base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!m || m[2].length > 7 * 1024 * 1024 || m[2].length % 4 !== 0)
    fail("Anexe PDF, imagem, texto ou DOCX de até 5 MB.");
  const size =
    Math.floor((m[2].length * 3) / 4) -
    (m[2].endsWith("==") ? 2 : m[2].endsWith("=") ? 1 : 0);
  if (size > 5 * 1024 * 1024) fail("Anexe um arquivo de até 5 MB.");
  return { name: value.name.trim(), uri: value.uri, mimeType: m[1], size };
}
export function applySchoolwork(
  next,
  actor,
  command,
  now,
  id,
  requireChild,
  text,
  validDate,
  fail,
) {
  const type = command.type;
  if (type === "assignment.create") {
    if (
      !assignmentKinds[command.kind] ||
      !validDate(command.due) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(command.time) ||
      !Array.isArray(command.childIds) ||
      !command.childIds.length
    )
      fail("Revise tipo, data, horário e destinatários.");
    command.childIds.forEach(requireChild);
    next.assignments.unshift({
      id: id(),
      kind: command.kind,
      title: text(command.title, 150),
      description: text(command.description, 6000),
      syllabus: text(command.syllabus, 4000),
      due: command.due,
      time: command.time,
      childIds: [...new Set(command.childIds)],
      authorId: actor.id,
      attachment: validateSchoolAttachment(command.attachment, fail),
      createdAt: now,
      submissions: [],
    });
  } else if (type === "assignment.submit" || type === "assignment.feedback") {
    const work = next.assignments.find((w) => w.id === command.assignmentId);
    if (!work) fail("Atividade não encontrada.", 404);
    requireChild(command.childId);
    if (!work.childIds.includes(command.childId))
      fail("Aluno não é destinatário.", 403);
    if (type === "assignment.submit") {
      if (actor.role !== "family")
        fail("A entrega deve ser registrada pelo responsável.", 403);
      if (work.kind === "exam") fail("Provas são realizadas na escola.");
      const prev = work.submissions.find((s) => s.childId === command.childId);
      if (prev?.reviewedAt)
        fail("A entrega já foi avaliada. Converse com o professor.", 409);
      work.submissions = work.submissions.filter(
        (s) => s.childId !== command.childId,
      );
      work.submissions.push({
        childId: command.childId,
        actorId: actor.id,
        note: text(command.note, 3000),
        attachment: validateSchoolAttachment(command.attachment, fail),
        submittedAt: now,
      });
    } else {
      const submission = work.submissions.find(
        (s) => s.childId === command.childId,
      );
      if (!submission) fail("Ainda não há uma entrega para avaliar.", 409);
      submission.feedback = text(command.feedback, 3000);
      submission.reviewedAt = now;
      submission.reviewedBy = actor.id;
    }
  } else if (type === "requestType.save") {
    if (
      typeof command.attachmentRequired !== "boolean" ||
      typeof command.active !== "boolean"
    )
      fail("Revise a configuração do tipo.");
    const old =
      command.requestTypeId &&
      next.requestTypes.find((t) => t.id === command.requestTypeId);
    if (command.requestTypeId && !old) fail("Tipo não encontrado.", 404);
    const values = {
      name: text(command.name, 120),
      description: text(command.description, 3000),
      attachmentRequired: command.attachmentRequired,
      active: command.active,
    };
    if (old) Object.assign(old, values);
    else next.requestTypes.push({ id: id(), ...values });
  } else if (type === "request.create") {
    if (actor.role !== "family")
      fail("A solicitação deve ser feita pelo responsável.", 403);
    requireChild(command.childId);
    const template = next.requestTypes.find(
      (t) => t.id === command.requestTypeId && t.active,
    );
    if (!template) fail("Tipo de solicitação indisponível.", 409);
    const attachment = validateSchoolAttachment(command.attachment, fail);
    if (template.attachmentRequired && !attachment)
      fail("Este tipo exige um anexo.");
    const ticketId = id();
    next.requests.unshift({
      id: ticketId,
      protocol: `TE-${now.slice(0, 10).replaceAll("-", "")}-${next.requests.length + 1}`,
      childId: command.childId,
      actorId: actor.id,
      requestTypeId: template.id,
      typeName: template.name,
      attachmentRequired: template.attachmentRequired,
      status: "open",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: id(),
          senderId: actor.id,
          body: text(command.body, 6000),
          attachment,
          at: now,
        },
      ],
    });
  } else if (type === "request.reply" || type === "request.status") {
    const request = next.requests.find((r) => r.id === command.requestId);
    if (!request) fail("Solicitação não encontrada.", 404);
    requireChild(request.childId);
    if (actor.role === "family" && request.actorId !== actor.id)
      fail("Solicitação sem vínculo autorizado.", 403);
    if (type === "request.reply") {
      if (request.status === "closed")
        fail("Esta solicitação está encerrada.", 409);
      request.messages.push({
        id: id(),
        senderId: actor.id,
        body: text(command.body, 6000),
        attachment: validateSchoolAttachment(command.attachment, fail),
        at: now,
      });
    } else {
      if (
        !["open", "in_progress", "waiting", "closed"].includes(command.status)
      )
        fail("Status inválido.");
      request.status = command.status;
    }
    request.updatedAt = now;
  } else return false;
  return true;
}
