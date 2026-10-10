const base = (process.env.THINKEDU_API_URL || "http://127.0.0.1:4340").replace(
  /\/$/,
  "",
);
const health = await fetch(base + "/health").then((r) => r.json());
if (health.name !== "thinkEdu" || health.demo !== true)
  throw Error("Use somente a API demonstrativa do thinkEdu.");
async function request(path, body, token) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ThinkEdu-Client": "web",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  return data;
}
const session = await request("/demo/session", { actorId: "administracao" });
try {
  const data = await request(
    "/commands",
    { type: "demo.populate" },
    session.token,
  );
  console.log(
    JSON.stringify(
      {
        unidades: data.units.length,
        turmas: data.classes.length,
        alunos: data.children.length,
        presencas: data.attendance.length,
        rotinas: data.routines.length,
        mensagens: data.messages.length,
        comunicados: data.notices.length,
        mural: data.posts.length,
        eventos: data.events.length,
        cobrancas: data.invoices.length,
      },
      null,
      2,
    ),
  );
} finally {
  await request("/session/logout", {}, session.token);
}
