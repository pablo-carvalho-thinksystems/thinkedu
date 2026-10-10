import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  createSeed,
  upgradeStore,
  visibleState,
  applyCommand,
} from "../../packages/core/model.mjs";

const demo = process.env.THINKEDU_DEMO === "true";
const path =
  process.env.THINKEDU_DATA_FILE ||
  fileURLToPath(new URL("./data/demo.json", import.meta.url));
let state = createSeed();
try {
  state = upgradeStore(JSON.parse(await readFile(path, "utf8")));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const sessions = new Map();
let queue = Promise.resolve();
const persist = async (next) => {
  await mkdir(dirname(path), {
    recursive: true,
  });
  await writeFile(`${path}.tmp`, JSON.stringify(next), "utf8");
  await rename(`${path}.tmp`, path);
  state = next;
};
const origins = (
  process.env.ALLOWED_ORIGIN || "http://localhost:4341,http://127.0.0.1:4342"
).split(",");
const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !origins.includes(origin)) {
    res.writeHead(403);
    return res.end();
  }
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(origin
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
  };
  const send = (status, body) => {
    res.writeHead(status, headers);
    res.end(JSON.stringify(body));
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...headers,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
    });
    return res.end();
  }
  try {
    const route = new URL(req.url, "http://localhost").pathname;
    if (route === "/health")
      return send(200, { name: "thinkEdu", status: "ok", demo });
    if (!demo)
      return send(503, {
        error:
          "Demonstração desativada. Autenticação de produção ainda não configurada.",
      });
    let body = {};
    if (req.method === "POST") {
      let input = "";
      for await (const chunk of req) {
        input += chunk;
        if (Buffer.byteLength(input) > 32000) {
          send(413, { error: "Solicitação muito grande." });
          req.destroy();
          return;
        }
      }
      try {
        body = JSON.parse(input);
      } catch {
        return send(400, { error: "JSON inválido." });
      }
    }
    if (route === "/demo/session" && req.method === "POST") {
      const actor = state.actors.find((a) => a.id === body.actorId);
      if (!actor) return send(400, { error: "Perfil inválido." });
      const token = randomUUID();
      sessions.set(token, { actorId: actor.id, expires: Date.now() + 3600000 });
      return send(200, { token, actor });
    }
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const session = sessions.get(token);
    if (!session || session.expires < Date.now())
      return send(401, { error: "Sessão inválida ou expirada." });
    const actor = state.actors.find((a) => a.id === session.actorId);
    if (route === "/state" && req.method === "GET")
      return send(200, visibleState(state, actor));
    if (route === "/commands" && req.method === "POST") {
      const task = queue.then(async () => {
        const next = applyCommand(state, actor, body);
        await persist(next);
        return visibleState(state, actor);
      });
      queue = task.catch(() => {});
      return send(200, await task);
    }
    return send(404, { error: "Rota não encontrada." });
  } catch (error) {
    send(error.status || 500, {
      error: error.status ? error.message : "Falha ao processar solicitação.",
    });
  }
});
server.listen(
  Number(process.env.PORT || 4340),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `thinkEdu API pronta em http://${process.env.HOST || "127.0.0.1"}:${server.address().port} (demo: ${demo})`,
    ),
);
