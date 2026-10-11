// A presentation filter; authorization is enforced independently by visibleState.
export function filterUnitView(view, unitId = "all") {
  if (unitId === "all") return view;
  const children = view.children.filter((c) => c.unitId === unitId);
  const ids = new Set(children.map((c) => c.id));
  const classes = view.classes.filter((g) => g.unitId === unitId);
  const classIds = new Set(classes.map((g) => g.id));
  const result = {
    ...view,
    children,
    classes,
    units: view.units.filter((u) => u.id === unitId),
  };
  for (const key of [
    "attendance",
    "routines",
    "messages",
    "invoices",
    "requests",
    "assistantThreads",
  ])
    result[key] = view[key].filter((r) => ids.has(r.childId));
  for (const key of ["activities", "notices", "posts", "events", "assignments"])
    result[key] = view[key]
      .filter((r) => r.childIds.some((id) => ids.has(id)))
      .map((r) => ({
        ...r,
        childIds: r.childIds.filter((id) => ids.has(id)),
        ...(key === "assignments"
          ? { submissions: r.submissions.filter((a) => ids.has(a.childId)) }
          : {}),
        ...(key === "notices"
          ? { responses: r.responses.filter((a) => ids.has(a.childId)) }
          : {}),
      }));
  result.knowledge = view.knowledge.filter(
    (k) =>
      (!k.unitIds.length || k.unitIds.includes(unitId)) &&
      (!k.classIds.length || k.classIds.some((c) => classIds.has(c))),
  );
  result.actors = view.actors.filter(
    (a) =>
      a.id === view.currentActor.id ||
      (a.role === "family"
        ? a.childIds?.some((id) => ids.has(id))
        : a.role === "teacher"
          ? a.classIds?.some((id) => classIds.has(id))
          : a.unitIds === undefined || a.unitIds.includes(unitId)),
  );
  return result;
}
