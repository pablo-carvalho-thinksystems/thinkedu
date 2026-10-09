export const DEMO_DATE = "2026-10-09";
export const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
export function createSeed() {
  return {
    version: 1,
    school: { id: "semente", name: "Escola Semente" },
    children: [
      {
        id: "lia",
        name: "Lia",
        classId: "jardim",
        group: "Jardim II",
        initials: "LI",
        tone: "sky",
        arrival: "8h12",
      },
      {
        id: "bento",
        name: "Bento",
        classId: "maternal",
        group: "Maternal I",
        initials: "BE",
        tone: "peach",
        arrival: "8h20",
      },
      {
        id: "miguel",
        name: "Miguel",
        classId: "jardim",
        group: "Jardim II",
        initials: "MI",
        tone: "sky",
        arrival: "8h15",
      },
      {
        id: "alice",
        name: "Alice",
        classId: "jardim",
        group: "Jardim II",
        initials: "AL",
        tone: "peach",
        arrival: "8h10",
      },
    ],
    actors: [
      {
        id: "rafael",
        name: "Rafael",
        role: "family",
        schoolId: "semente",
        childIds: ["lia", "bento"],
        classIds: [],
        financial: true,
      },
      {
        id: "ana",
        name: "Ana",
        role: "teacher",
        schoolId: "semente",
        childIds: [],
        classIds: ["jardim", "maternal"],
        financial: false,
      },
      {
        id: "direcao",
        name: "Direção",
        role: "admin",
        schoolId: "semente",
        childIds: [],
        classIds: ["jardim", "maternal"],
        financial: true,
      },
    ],
    routines: [
      {
        id: "r-lia",
        childId: "lia",
        date: DEMO_DATE,
        meal: "Bem",
        sleep: 45,
        hygiene: "Registrada",
        mood: "Animada",
        note: "Lia explorou formas e texturas com curiosidade.",
        published: true,
        updatedAt: "2026-10-09T14:05:00-03:00",
      },
      {
        id: "r-bento",
        childId: "bento",
        date: DEMO_DATE,
        meal: "Bem",
        sleep: 50,
        hygiene: "Registrada",
        mood: "Tranquilo",
        note: "Bento explorou novas cores hoje.",
        published: true,
        updatedAt: "2026-10-09T14:00:00-03:00",
      },
    ],
    notices: [
      {
        id: "n-passeio",
        title: "Passeio ao Jardim Botânico",
        body: "Vamos explorar a natureza! A saída será às 8h30 e o retorno às 11h30. Envie uma garrafa de água e use o uniforme. Precisamos da autorização individual para participar.",
        type: "authorization",
        childIds: ["lia", "miguel", "alice"],
        due: "2026-10-12",
        createdAt: "2026-10-09T10:00:00-03:00",
        readBy: [],
        responses: [],
      },
      {
        id: "n-roupa",
        title: "Uma troca de roupa",
        body: "Envie uma troca de roupa identificada para o Bento na próxima aula.",
        type: "request",
        childIds: ["bento"],
        due: "2026-10-13",
        createdAt: "2026-10-09T11:30:00-03:00",
        readBy: [],
        responses: [],
      },
      {
        id: "n-encontro",
        title: "Encontro com as famílias",
        body: "Esperamos vocês na sexta, 16 de outubro, às 17h, para conversar sobre nossas descobertas.",
        type: "update",
        childIds: ["lia", "bento", "miguel", "alice"],
        due: null,
        createdAt: "2026-10-08T10:00:00-03:00",
        readBy: ["rafael"],
        responses: [],
      },
    ],
    messages: [
      {
        id: "m-1",
        childId: "lia",
        senderId: "rafael",
        body: "Podemos enviar o casaco na próxima aula?",
        createdAt: "2026-10-09T10:42:00-03:00",
      },
      {
        id: "m-2",
        childId: "lia",
        senderId: "ana",
        body: "Claro, Rafael! Pode enviar identificado com o nome da Lia.",
        createdAt: "2026-10-09T11:00:00-03:00",
      },
    ],
    invoices: [
      {
        id: "i-lia-oct",
        childId: "lia",
        reference: "Outubro de 2026",
        amount: 145000,
        due: "2026-10-15",
        status: "open",
      },
      {
        id: "i-bento-oct",
        childId: "bento",
        reference: "Outubro de 2026",
        amount: 115000,
        due: "2026-10-15",
        status: "open",
      },
      {
        id: "i-lia-sept",
        childId: "lia",
        reference: "Setembro de 2026",
        amount: 145000,
        due: "2026-09-15",
        status: "paid",
      },
    ],
    events: [
      {
        id: "e-passeio",
        title: "Passeio ao Jardim Botânico",
        date: "2026-10-13",
        time: "8h30–11h30",
        place: "Jardim Botânico",
        childIds: ["lia", "miguel", "alice"],
        noticeId: "n-passeio",
        tone: "lime",
      },
      {
        id: "e-encontro",
        title: "Encontro com as famílias",
        date: "2026-10-16",
        time: "17h",
        place: "Escola Semente",
        childIds: ["lia", "bento", "miguel", "alice"],
        noticeId: "n-encontro",
        tone: "sky",
      },
    ],
    audit: [],
  };
}
export function accessibleChildren(state, actor) {
  if (actor.schoolId !== state.school.id) return [];
  return state.children.filter(
    (c) =>
      actor.role === "admin" ||
      (actor.role === "family"
        ? actor.childIds.includes(c.id)
        : actor.classIds.includes(c.classId)),
  );
}
export function visibleState(state, actor) {
  const children = accessibleChildren(state, actor),
    ids = new Set(children.map((c) => c.id));
  const { audit, actors, ...rest } = state;
  return {
    ...rest,
    children,
    routines: state.routines.filter(
      (r) => ids.has(r.childId) && (actor.role !== "family" || r.published),
    ),
    notices: state.notices
      .filter((n) => n.childIds.some((id) => ids.has(id)))
      .map((n) => ({
        ...n,
        childIds: n.childIds.filter((id) => ids.has(id)),
        responses: n.responses.filter((r) => ids.has(r.childId)),
      })),
    messages: state.messages.filter((m) => ids.has(m.childId)),
    events: state.events
      .filter((e) => e.childIds.some((id) => ids.has(id)))
      .map((e) => ({ ...e, childIds: e.childIds.filter((id) => ids.has(id)) })),
    invoices: actor.financial
      ? state.invoices.filter((i) => ids.has(i.childId))
      : [],
    actors: actors
      .filter(
        (a) =>
          a.id === actor.id ||
          a.role === "teacher" ||
          (actor.role !== "family" && a.childIds.some((id) => ids.has(id))),
      )
      .map((a) => ({ id: a.id, name: a.name, role: a.role })),
    audit: actor.role === "admin" ? audit : [],
  };
}
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function text(value, max = 2000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail("Texto inválido.");
  return value.trim();
}
function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function applyCommand(
  state,
  actor,
  command,
  now = new Date().toISOString(),
  id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
) {
  if (
    !state.actors.some((a) => a.id === actor.id) ||
    actor.schoolId !== state.school.id
  )
    fail("Acesso negado.", 403);
  const ids = new Set(accessibleChildren(state, actor).map((c) => c.id));
  const requireChild = (childId) => {
    if (!ids.has(childId)) fail("Aluno sem vínculo autorizado.", 403);
  };
  const teacher = () => {
    if (!["teacher", "admin"].includes(actor.role))
      fail("Somente a equipe pode executar esta ação.", 403);
  };
  const next = structuredClone(state),
    type = command?.type;
  if (type === "message.send") {
    requireChild(command.childId);
    next.messages.push({
      id: id(),
      childId: command.childId,
      senderId: actor.id,
      body: text(command.body),
      createdAt: now,
    });
  } else if (type === "notice.create") {
    teacher();
    if (!Array.isArray(command.childIds) || !command.childIds.length)
      fail("Selecione os destinatários.");
    command.childIds.forEach(requireChild);
    if (!["update", "request", "authorization"].includes(command.kind))
      fail("Tipo inválido.");
    if (command.due && !validDate(command.due)) fail("Data inválida.");
    if (command.kind !== "update" && !command.due)
      fail("Informe um prazo para a solicitação.");
    next.notices.unshift({
      id: id(),
      title: text(command.title, 150),
      body: text(command.body),
      type: command.kind,
      childIds: [...new Set(command.childIds)],
      due: command.due || null,
      createdAt: now,
      readBy: [],
      responses: [],
    });
  } else if (type === "notice.read" || type === "notice.respond") {
    const notice = next.notices.find((n) => n.id === command.noticeId);
    if (!notice) fail("Comunicado não encontrado.", 404);
    if (!notice.childIds.some((cid) => ids.has(cid)))
      fail("Acesso negado.", 403);
    if (!notice.readBy.includes(actor.id)) notice.readBy.push(actor.id);
    if (type === "notice.respond") {
      if (actor.role !== "family")
        fail("A resposta deve ser do responsável.", 403);
      requireChild(command.childId);
      if (!notice.childIds.includes(command.childId))
        fail("Aluno não é destinatário.", 403);
      if (
        notice.type === "update" ||
        !["confirmed", "declined"].includes(command.answer)
      )
        fail("Resposta inválida.");
      if (notice.due && now.slice(0, 10) > notice.due)
        fail("Prazo encerrado. Converse com a escola.", 409);
      notice.responses = notice.responses.filter(
        (r) => r.childId !== command.childId,
      );
      notice.responses.push({
        childId: command.childId,
        actorId: actor.id,
        answer: command.answer,
        at: now,
      });
    }
  } else if (type === "routine.save") {
    teacher();
    requireChild(command.childId);
    if (
      !validDate(command.date) ||
      !["Bem", "Pouco", "Não comeu"].includes(command.meal) ||
      !Number.isInteger(command.sleep) ||
      command.sleep < 0 ||
      command.sleep > 600 ||
      !["Animada", "Tranquilo", "Tranquila", "Cansada"].includes(
        command.mood,
      ) ||
      !["Registrada", "Não registrado"].includes(command.hygiene) ||
      typeof command.note !== "string" ||
      command.note.length > 2000 ||
      typeof command.published !== "boolean"
    )
      fail("Revise os campos da rotina.");
    const routine = {
      id: `r-${command.childId}-${command.date}`,
      childId: command.childId,
      date: command.date,
      meal: command.meal,
      sleep: command.sleep,
      mood: command.mood,
      hygiene: command.hygiene,
      note: command.note.trim(),
      published: command.published,
      updatedAt: now,
    };
    next.routines = next.routines.filter(
      (r) => !(r.childId === routine.childId && r.date === routine.date),
    );
    next.routines.push(routine);
  } else if (type === "event.create") {
    teacher();
    if (
      !validDate(command.date) ||
      !/^\d{2}:\d{2}$/.test(command.time) ||
      Number(command.time.slice(0, 2)) > 23 ||
      Number(command.time.slice(3)) > 59 ||
      !Array.isArray(command.childIds) ||
      !command.childIds.length
    )
      fail("Revise a data, horário e destinatários.");
    command.childIds.forEach(requireChild);
    next.events.push({
      id: id(),
      title: text(command.title, 150),
      date: command.date,
      time: command.time,
      place: text(command.place, 150),
      childIds: [...new Set(command.childIds)],
      noticeId: null,
      tone: "sky",
    });
  } else fail("Ação não disponível.");
  next.audit.push({
    id: id(),
    actorId: actor.id,
    type,
    at: now,
    subject: command.childId || command.noticeId || null,
  });
  return next;
}
export function calendarCells(year, month) {
  const first = new Date(year, month, 1);
  const prefix = (first.getDay() + 6) % 7;
  return [
    ...Array(prefix).fill(null),
    ...Array.from(
      { length: new Date(year, month + 1, 0).getDate() },
      (_, i) => i + 1,
    ),
  ];
}
