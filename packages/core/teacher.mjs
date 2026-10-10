export function seedTeacherDay() {
  return {
    attendance: [
      {
        id: "a-lia",
        childId: "lia",
        date: "2026-10-09",
        status: "present",
        arrival: "08:12",
        departure: null,
        note: "",
        updatedAt: "2026-10-09T08:12:00-03:00",
      },
      {
        id: "a-bento",
        childId: "bento",
        date: "2026-10-09",
        status: "present",
        arrival: "08:20",
        departure: null,
        note: "",
        updatedAt: "2026-10-09T08:20:00-03:00",
      },
      {
        id: "a-alice",
        childId: "alice",
        date: "2026-10-09",
        status: "present",
        arrival: "08:10",
        departure: null,
        note: "",
        updatedAt: "2026-10-09T08:10:00-03:00",
      },
    ],
    activities: [
      {
        id: "p-formas",
        title: "Um mundo de formas",
        description:
          "Explorar formas e texturas no ateliê. Preparar papéis, blocos e giz de cera.",
        date: "2026-10-09",
        time: "10:15",
        childIds: ["lia", "miguel", "alice"],
        status: "planned",
        updatedAt: "2026-10-09T07:30:00-03:00",
      },
      {
        id: "p-jardim",
        title: "Descobertas no jardim",
        description:
          "Observar folhas e cores com a turma. Separar lupas e cestos.",
        date: "2026-10-09",
        time: "14:30",
        childIds: ["lia", "miguel", "alice"],
        status: "planned",
        updatedAt: "2026-10-09T07:30:00-03:00",
      },
      {
        id: "p-cores",
        title: "Brincar com as cores",
        description: "Experimentar misturas com tintas e esponjas no Maternal.",
        date: "2026-10-09",
        time: "10:00",
        childIds: ["bento"],
        status: "planned",
        updatedAt: "2026-10-09T07:30:00-03:00",
      },
    ],
  };
}
export function classroomDay(state, children, date) {
  const ids = new Set(children.map((c) => c.id));
  const attendance = state.attendance.filter(
    (a) => a.date === date && ids.has(a.childId),
  );
  const routines = state.routines.filter(
    (a) => a.date === date && ids.has(a.childId),
  );
  const activities = state.activities
    .filter((a) => a.date === date && a.childIds.some((id) => ids.has(id)))
    .sort((a, b) => a.time.localeCompare(b.time));
  return {
    attendance,
    routines,
    activities,
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    left: attendance.filter((a) => a.status === "left").length,
    unchecked: children.length - attendance.length,
    published: routines.filter((a) => a.published).length,
    drafts: routines.filter((a) => !a.published).length,
    pendingRoutines: children.filter(
      (c) =>
        !attendance.some((a) => a.childId === c.id && a.status === "absent") &&
        !routines.some((a) => a.childId === c.id && a.published),
    ).length,
  };
}
export function attendanceLabel(record) {
  if (!record) return "Chamada ainda não registrada";
  if (record.status === "absent") return "Ausência registrada";
  if (record.status === "left") return `Saída registrada · ${record.departure}`;
  return `Na escola · ${record.arrival}`;
}
