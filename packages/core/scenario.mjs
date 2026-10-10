// Deterministic fictional data. Existing records and identities are preserved.
export function populateSchoolScenario(input) {
  const s = structuredClone(input);
  if (
    s.classes.length > 20 ||
    s.classes.some(
      (g) => s.children.filter((c) => c.classId === g.id).length > 16,
    )
  )
    throw Object.assign(
      new Error(
        "O cenário preserva os dados existentes: é necessário ter até 20 turmas e até 16 alunos por turma.",
      ),
      { status: 409 },
    );
  const locations = [
    [
      "central",
      "Unidade Central",
      "Rua das Sementes",
      "120",
      "Centro",
      "01000-000",
    ],
    [
      "jardins",
      "Unidade Jardins",
      "Rua dos Ipês",
      "240",
      "Jardins",
      "01400-000",
    ],
    [
      "parque",
      "Unidade Parque",
      "Avenida das Árvores",
      "360",
      "Parque Verde",
      "02000-000",
    ],
    ["lago", "Unidade Lago", "Rua das Flores", "480", "Vila Lago", "03000-000"],
  ];
  for (const [id, name, street, number, neighborhood, postalCode] of locations)
    if (!s.units.some((u) => u.id === id))
      s.units.push({
        id,
        schoolId: s.school.id,
        name,
        address: {
          street,
          number,
          neighborhood,
          postalCode,
          city: "São Paulo",
          state: "SP",
        },
      });
  if (s.classes.length === 2 && s.classes.some((g) => g.id === "maternal"))
    s.classes.find((g) => g.id === "maternal").unitId = "jardins";
  const levels = [
    "Berçário II",
    "Maternal I",
    "Maternal II",
    "Jardim I",
    "Jardim II",
  ];
  for (let i = s.classes.length; i < 20; i++) {
    const unitId = locations[Math.floor(i / 5)][0];
    s.classes.push({
      id: `turma-${String(i + 1).padStart(2, "0")}`,
      unitId,
      name: `${levels[i % 5]} · ${String.fromCharCode(65 + Math.floor(i / 5))}`,
      capacity: 16,
    });
  }
  // Balance five classrooms per unit, preserving classroom identities.
  s.classes.forEach((g, i) => {
    g.unitId = locations[Math.floor(i / 5)][0];
    g.capacity = 16;
  });
  // Put Bento's class in another unit while keeping five classrooms per unit.
  const m = s.classes.find((g) => g.id === "maternal");
  if (m && m.unitId === "central") {
    const swap = s.classes.find((g) => g.unitId === "jardins");
    swap.unitId = "central";
    m.unitId = "jardins";
  }
  const names = [
    "Helena",
    "Arthur",
    "Laura",
    "Heitor",
    "Cecília",
    "Davi",
    "Isabel",
    "Gabriel",
    "Sofia",
    "Samuel",
    "Marina",
    "Theo",
    "Clara",
    "Lucas",
    "Julia",
    "Pedro",
  ];
  const surnames = [
    "Almeida",
    "Barbosa",
    "Castro",
    "Dias",
    "Esteves",
    "Freitas",
    "Gomes",
    "Lima",
    "Mendes",
    "Nunes",
    "Oliveira",
    "Pereira",
    "Ribeiro",
    "Santos",
    "Teixeira",
    "Vieira",
    "Costa",
    "Rocha",
    "Souza",
    "Martins",
  ];
  for (const [index, g] of s.classes.entries()) {
    const existing = s.children.filter((c) => c.classId === g.id);
    for (let n = existing.length; n < 16; n++) {
      const id = `aluno-${g.id}-${n + 1}`,
        name = `${names[n]} ${surnames[index]}`;
      s.children.push({
        id,
        name,
        classId: g.id,
        unitId: g.unitId,
        group: g.name,
        initials: name
          .split(" ")
          .map((v) => v[0])
          .join(""),
        tone: n % 2 ? "peach" : "sky",
        arrival: "8h05",
      });
    }
    for (const c of s.children.filter((c) => c.classId === g.id)) {
      c.unitId = g.unitId;
      c.group = g.name;
    }
    const teacherId = `professor-${g.id}`;
    if (!s.actors.some((a) => a.id === teacherId))
      s.actors.push({
        id: teacherId,
        name: `${["Beatriz", "Carolina", "Daniela", "Fernanda", "Joana"][index % 5]} ${surnames[index]}`,
        role: "teacher",
        schoolId: s.school.id,
        classIds: [g.id],
        childIds: [],
        unitIds: [g.unitId],
        financial: false,
        active: true,
      });
    const childIds = s.children
      .filter((c) => c.classId === g.id)
      .map((c) => c.id);
    for (let i = 0; i < 2; i++) {
      const nid = `escala-comunicado-${g.id}-${i}`;
      if (!s.notices.some((n) => n.id === nid))
        s.notices.push({
          id: nid,
          title: i
            ? "Materiais para a próxima descoberta"
            : "Encontro com as famílias",
          body: i
            ? "Envie uma caixa pequena identificada para nossa atividade de construção."
            : "Nossa turma vai compartilhar as descobertas da semana com as famílias.",
          type: i ? "request" : "authorization",
          childIds,
          due: "2026-10-16",
          createdAt: `2026-10-0${8 + i}T12:00:00.000Z`,
          readBy: [],
          responses: [],
        });
      const pid = `escala-mural-${g.id}-${i}`;
      if (!s.posts.some((p) => p.id === pid))
        s.posts.push({
          id: pid,
          title: i ? "Descobertas no jardim" : "Nossa semana em imagens",
          body: "Exploramos cores, texturas e histórias em atividades de cooperação.",
          kind: "text",
          attachment: null,
          childIds,
          authorId: teacherId,
          createdAt: `2026-10-0${8 + i}T13:00:00.000Z`,
        });
      const eid = `escala-evento-${g.id}-${i}`;
      if (!s.events.some((e) => e.id === eid))
        s.events.push({
          id: eid,
          title: i ? "Oficina de histórias" : "Encontro da turma",
          date: i ? "2026-10-20" : "2026-10-16",
          time: "17:00",
          place: s.units.find((u) => u.id === g.unitId).name,
          childIds,
          noticeId: null,
          tone: "sky",
        });
    }
  }
  for (const u of s.units) {
    const id = `coordenacao-${u.id}`;
    if (!s.actors.some((a) => a.id === id))
      s.actors.push({
        id,
        name: `Coordenação · ${u.name}`,
        role: "coordinator",
        schoolId: s.school.id,
        classIds: [],
        childIds: [],
        unitIds: [u.id],
        financial: false,
        active: true,
      });
  }
  const unlinked = s.children.filter(
    (c) =>
      !s.actors.some((a) => a.role === "family" && a.childIds.includes(c.id)),
  );
  for (let i = 0; i < unlinked.length; i += 2) {
    const kids = unlinked.slice(i, i + 2),
      id = `familia-${kids[0].id}`;
    s.actors.push({
      id,
      name: `Responsável ${kids[0].name.split(" ").at(-1)} ${String(i / 2 + 1).padStart(3, "0")}`,
      role: "family",
      schoolId: s.school.id,
      classIds: [],
      childIds: kids.map((c) => c.id),
      financial: true,
      active: true,
    });
  }
  for (const [i, c] of s.children.entries()) {
    const teacher = s.actors.find(
      (a) => a.role === "teacher" && a.classIds.includes(c.classId),
    );
    const family = s.actors.find(
      (a) => a.role === "family" && a.childIds.includes(c.id),
    );
    for (let d = 6; d <= 9; d++) {
      const date = `2026-10-0${d}`;
      if (!s.routines.some((a) => a.childId === c.id && a.date === date))
        s.routines.push({
          id: `escala-rotina-${c.id}-${d}`,
          childId: c.id,
          date,
          meal: i % 4 ? "Bem" : "Pouco",
          sleep: 30 + (i % 5) * 10,
          hygiene: "Registrada",
          mood: i % 2 ? "Animada" : "Tranquilo",
          note: `${c.name.split(" ")[0]} participou da roda de histórias e explorou novos materiais com a turma.`,
          published: i % 8 !== 0,
          updatedAt: `${date}T17:00:00.000Z`,
        });
      if (!s.attendance.some((a) => a.childId === c.id && a.date === date))
        s.attendance.push({
          id: `escala-presenca-${c.id}-${d}`,
          childId: c.id,
          date,
          status: i % 12 ? "present" : "absent",
          arrival: i % 12 ? "08:05" : null,
          departure: null,
          note: i % 12 ? "" : "Ausência informada pela família.",
          updatedAt: `${date}T11:10:00.000Z`,
        });
      const mid = `escala-mensagem-${c.id}-${d}`;
      if (!s.messages.some((a) => a.id === mid))
        s.messages.push({
          id: mid,
          childId: c.id,
          senderId: d % 2 ? teacher.id : family.id,
          body:
            d % 2
              ? "Participou muito bem das descobertas de hoje."
              : "Obrigada pelo registro! Enviaremos o material identificado.",
          createdAt: `${date}T18:00:00.000Z`,
        });
    }
    for (const [ref, date, status] of [
      ["Outubro de 2026", "2026-10-15", "open"],
      ["Setembro de 2026", "2026-09-15", "paid"],
    ])
      if (!s.invoices.some((a) => a.childId === c.id && a.reference === ref))
        s.invoices.push({
          id: `escala-cobranca-${c.id}-${date}`,
          childId: c.id,
          reference: ref,
          amount: 115000 + (i % 4) * 10000,
          due: date,
          status,
        });
  }
  // Keep generated examples compatible with real commands and absence records.
  // Entries subsequently edited by the team keep their new timestamp and content.
  for (const routine of s.routines) {
    if (
      !routine.id.startsWith("escala-rotina-") ||
      routine.updatedAt !== `${routine.date}T17:00:00.000Z`
    )
      continue;
    if (routine.meal === "Parcial") routine.meal = "Pouco";
    const attendance = s.attendance.find(
      (a) => a.childId === routine.childId && a.date === routine.date,
    );
    if (attendance?.status === "absent") {
      routine.meal = "Não comeu";
      routine.sleep = 0;
      routine.hygiene = "Não registrado";
      routine.note =
        "Ausência informada pela família. Nenhuma atividade na escola foi registrada neste dia.";
      routine.published = false;
    }
  }
  for (const message of s.messages) {
    if (!message.id.startsWith("escala-mensagem-")) continue;
    const attendance = s.attendance.find(
      (a) =>
        a.childId === message.childId &&
        a.date === message.createdAt.slice(0, 10),
    );
    if (attendance?.status === "absent")
      message.body =
        s.actors.find((a) => a.id === message.senderId)?.role === "family"
          ? "Hoje não poderá ir à escola. A ausência foi informada."
          : "Registramos a ausência de hoje. Esperamos vocês na próxima aula.";
  }
  return s;
}
