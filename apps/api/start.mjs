import {
  prepareAssistantAnswer,
  assistantFingerprint,
} from "./samuca-provider.mjs";
import { handleSchoolMcp } from "./mcp.mjs";
import { createServer } from "node:http";
import { authenticate } from "./auth.mjs";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  createSeed,
  upgradeStore,
  visibleState,
  applyCommand,
} from "../../packages/core/model.mjs";
import { can, effectiveActor } from "../../packages/core/permissions.mjs";
import {
  makeAuditEntry,
  filterAudit,
  csvAudit,
  auditLabels,
} from "../../packages/core/audit.mjs";
import { releasePolicy } from "../../packages/core/release.mjs";
import { sealAudit, verifyAudit } from "./audit-store.mjs";
const demo = process.env.THINKEDU_DEMO === "true";
const path =
  process.env.THINKEDU_DATA_FILE ||
  fileURLToPath(new URL("./data/demo.json", import.meta.url));
let state = createSeed();
try {
  state = upgradeStore(JSON.parse(await readFile(path, "utf8")));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const keyPath = process.env.THINKEDU_AUDIT_KEY_FILE || path + ".audit.key";
await mkdir(dirname(keyPath), { recursive: true });
let auditKey,
  freshKey = false;
try {
  auditKey = await readFile(keyPath);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  if (state.auditIntegrity)
    throw Error(
      "A chave original da auditoria está ausente. Restaure-a antes de iniciar a API.",
    );
  auditKey = randomBytes(32);
  await writeFile(keyPath, auditKey, { flag: "wx", mode: 0o600 });
  freshKey = true;
}
if (!freshKey && !verifyAudit(state, auditKey))
  throw Error(
    "O histórico de auditoria foi alterado ou está sem seu selo. Restaure os dados e a chave originais.",
  );
if (freshKey) {
  state.audit = state.audit.map((e) => ({
    ...e,
    actorName: e.actorName || "Nome não registrado",
    actorRole: e.actorRole || "legacy",
    source: e.source || "legacy",
    legacy: !e.changes,
    changes: e.changes || [],
  }));
  sealAudit(state, auditKey);
}
const sessions = new Map();
const loginAttempts = new Map();
let queue = Promise.resolve();
async function persist(next) {
  sealAudit(next, auditKey);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path + ".tmp", JSON.stringify(next), "utf8");
  await rename(path + ".tmp", path);
  state = next;
}
await persist(state);
function serial(fn) {
  const task = queue.then(fn);
  queue = task.catch(() => {});
  return task;
}
function record(
  next,
  actor,
  type,
  context,
  { outcome = "succeeded", error = null, metadata = {}, subject = null } = {},
) {
  next.audit.push(
    makeAuditEntry(next, actor, {
      id: randomUUID(),
      type,
      context,
      outcome,
      error,
      metadata,
      subject,
    }),
  );
  return next;
}
async function log(actor, type, context, options) {
  return serial(async () =>
    persist(record(structuredClone(state), actor, type, context, options)),
  );
}
const origins = (
  process.env.ALLOWED_ORIGIN || "http://localhost:4341,http://127.0.0.1:4342"
).split(",");
const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, "http://localhost");
  const route = url.pathname;
  const context = {
    requestId: randomUUID(),
    source: ["web", "app"].includes(req.headers["x-thinkedu-client"])
      ? req.headers["x-thinkedu-client"]
      : "api",
    method: req.method,
    path: [
      "/health",
      "/app/version",
      "/auth/login",
      "/demo/session",
      "/demo/profiles",
      "/state",
      "/commands",
      "/audit",
      "/session/logout",
      "/mcp",
    ].includes(route)
      ? route
      : "/unknown",
  };
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  const session = sessions.get(token);
  let actor = session
    ? state.actors.find((a) => a.id === session.actorId)
    : null;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": context.requestId,
    ...(origin && origins.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
  };
  const send = (status, body, extra = {}) => {
    res.writeHead(status, { ...headers, ...extra });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };
  let logged = false,
    action = "request.rejected";
  try {
    if (origin && !origins.includes(origin)) {
      await log(actor, "request.rejected", context, {
        outcome: "denied",
        error: "Origem não autorizada.",
      });
      logged = true;
      return send(403, { error: "Origem não autorizada." });
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...headers,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers":
          "Authorization,Content-Type,X-ThinkEdu-Client,MCP-Protocol-Version",
      });
      return res.end();
    }
    if (route === "/health")
      return send(200, { name: "thinkEdu", status: "ok", demo });
    if (route === "/app/version" && req.method === "GET") {
      const platform = url.searchParams.get("platform");
      if (!["ios", "android"].includes(platform))
        return send(400, { error: "Plataforma inválida." });
      let config = {};
      if (process.env.THINKEDU_RELEASE_FILE)
        try {
          config = JSON.parse(
            await readFile(process.env.THINKEDU_RELEASE_FILE, "utf8"),
          );
        } catch {}
      return send(200, releasePolicy(config[platform], platform));
    }
    if (!demo && route.startsWith("/demo/"))
      return send(503, {
        error:
          "Demonstração desativada. Autenticação de produção ainda não configurada.",
      });
    let body = {};
    if (req.method === "POST") {
      let input = "";
      for await (const chunk of req) {
        input += chunk;
        if (
          Buffer.byteLength(input) >
          (route === "/commands" ? 8 * 1024 * 1024 : 32000)
        ) {
          const e = Error("Solicitação muito grande.");
          e.status = 413;
          throw e;
        }
      }
      try {
        body = input || route !== "/session/logout" ? JSON.parse(input) : {};
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw Error("JSON inválido.");
      } catch {
        const e = Error("JSON inválido.");
        e.status = 400;
        throw e;
      }
      if (body?.type && auditLabels[body.type]) action = body.type;
    }
    if (route === "/auth/login" && req.method === "POST") {
      action = "session.rejected";
      if (!process.env.THINKEDU_AUTH_FILE) {
        return send(503, {
          error:
            "Sua escola ainda não ativou o acesso. Entre em contato com a secretaria.",
        });
      }
      const address = req.socket.remoteAddress || "unknown";
      const attempt = loginAttempts.get(address) || {
        count: 0,
        reset: Date.now() + 900000,
      };
      if (attempt.reset < Date.now()) {
        attempt.count = 0;
        attempt.reset = Date.now() + 900000;
      }
      if (attempt.count >= 10)
        return send(429, {
          error: "Muitas tentativas. Aguarde 15 minutos para tentar novamente.",
        });
      attempt.count++;
      loginAttempts.set(address, attempt);
      // Keep the limiter bounded; each source has a fixed window.
      for (const [key, value] of loginAttempts)
        if (value.reset < Date.now()) loginAttempts.delete(key);
      if (loginAttempts.size > 10000)
        loginAttempts.delete(loginAttempts.keys().next().value);
      const accounts = JSON.parse(
        await readFile(process.env.THINKEDU_AUTH_FILE, "utf8"),
      );
      actor = authenticate(accounts, state, body.email, body.password);
      if (!actor) {
        const e = Error("E-mail ou senha incorretos.");
        e.status = 401;
        throw e;
      }
      action = "session.login";
      await log(actor, action, context);
      logged = true;
      loginAttempts.delete(address);
      const newToken = randomBytes(32).toString("hex");
      sessions.set(newToken, {
        actorId: actor.id,
        expires: Date.now() + 3600000,
      });
      return send(200, {
        token: newToken,
        actor: effectiveActor(state, actor),
      });
    }
    if (route === "/demo/profiles" && req.method === "GET") {
      action = "profiles.read";
      await log(actor, action, context);
      logged = true;
      return send(
        200,
        state.actors
          .filter((a) => a.active !== false && a.schoolId === state.school.id)
          .map((a) => ({ id: a.id, name: a.name, role: a.role })),
      );
    }
    if (route === "/demo/session" && req.method === "POST") {
      action = "session.login";
      actor = state.actors.find(
        (a) => a.id === body.actorId && a.schoolId === state.school.id,
      );
      if (!actor || actor.active === false) {
        const e = Error("Perfil inválido ou desativado.");
        e.status = 403;
        throw e;
      }
      await log(actor, action, context);
      logged = true;
      const newToken = randomUUID();
      sessions.set(newToken, {
        actorId: actor.id,
        expires: Date.now() + 3600000,
      });
      return send(200, { token: newToken, actor });
    }
    if (
      !session ||
      session.expires < Date.now() ||
      !actor ||
      actor.active === false
    ) {
      action = "session.rejected";
      const e = Error("Sessão inválida, expirada ou acesso desativado.");
      e.status = 401;
      throw e;
    }
    if (route === "/mcp" && req.method === "POST") {
      await log(actor, "mcp.request", context, {
        metadata: { method: String(body.method || "").slice(0, 80) },
      });
      for (const [name, value] of Object.entries(headers))
        res.setHeader(name, value);
      logged = true;
      return await handleSchoolMcp(
        req,
        res,
        body,
        (tool, args, read) =>
          serial(async () => {
            const current = state.actors.find((a) => a.id === session.actorId);
            if (
              !current ||
              current.active === false ||
              session.expires < Date.now()
            )
              throw Error("Sessão expirada.");
            try {
              const result = read(visibleState(state, current));
              await persist(
                record(structuredClone(state), current, "mcp.read", context, {
                  metadata: { tool, args },
                }),
              );
              return result;
            } catch (e) {
              await persist(
                record(structuredClone(state), current, "mcp.read", context, {
                  outcome: "denied",
                  error: e.message,
                  metadata: { tool },
                }),
              );
              throw e;
            }
          }),
        (command) =>
          serial(async () => {
            const current = state.actors.find((a) => a.id === session.actorId);
            if (
              !current ||
              current.active === false ||
              session.expires < Date.now()
            )
              throw Error("Sessão expirada.");
            let next;
            try {
              next = applyCommand(state, current, command);
            } catch (e) {
              await persist(
                record(
                  structuredClone(state),
                  current,
                  "request.rejected",
                  context,
                  {
                    outcome: "denied",
                    error: e.message,
                    metadata: { commandType: command.type },
                  },
                ),
              );
              throw e;
            }
            Object.assign(next.audit.at(-1), {
              source: "mcp",
              requestId: context.requestId,
              method: context.method,
              path: "/mcp",
            });
            await persist(next);
            return visibleState(state, current);
          }),
      );
    }
    if (route === "/session/logout" && req.method === "POST") {
      action = "session.logout";
      await log(actor, action, context);
      logged = true;
      sessions.delete(token);
      return send(200, { ok: true });
    }
    if (route === "/state" && req.method === "GET") {
      action = "state.read";
      const data = await serial(async () => {
        const current = state.actors.find((a) => a.id === session.actorId);
        if (!current || current.active === false) {
          const e = Error("Acesso desativado.");
          e.status = 401;
          throw e;
        }
        const view = visibleState(state, current);
        const access = Object.fromEntries(
          [
            "units",
            "classes",
            "children",
            "attendance",
            "routines",
            "assignments",
            "requests",
            "requestTypes",
            "activities",
            "notices",
            "posts",
            "messages",
            "events",
            "invoices",
          ]
            .filter((k) => view[k].length)
            .map((k) => [k, view[k].map((r) => r.id)]),
        );
        await persist(
          record(structuredClone(state), current, action, context, {
            metadata: { access },
          }),
        );
        return visibleState(state, current);
      });
      logged = true;
      return send(200, data);
    }
    if (route === "/audit" && req.method === "GET") {
      const format = url.searchParams.get("format");
      action = format ? "audit.export" : "audit.read";
      const result = await serial(async () => {
        const current = state.actors.find((a) => a.id === session.actorId);
        if (!can(effectiveActor(state, current), "audit.read")) {
          const e = Error(
            "Seu perfil não tem acesso ao histórico de auditoria.",
          );
          e.status = 403;
          throw e;
        }
        const filters = Object.fromEntries(
          ["from", "to", "actorId", "type", "outcome", "source", "search"]
            .filter((k) => url.searchParams.get(k))
            .map((k) => [
              k,
              url.searchParams.get(k).slice(0, k === "search" ? 200 : 100),
            ]),
        );
        for (const k of ["from", "to"])
          if (
            filters[k] &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(filters[k]) ||
              Number.isNaN(Date.parse(filters[k])) ||
              new Date(filters[k]).toISOString().slice(0, 10) !== filters[k])
          ) {
            const e = Error("Data de filtro inválida.");
            e.status = 400;
            throw e;
          }
        if (filters.from && filters.to && filters.from > filters.to) {
          const e = Error("O início deve ser anterior ao fim.");
          e.status = 400;
          throw e;
        }
        if (format && !["csv", "json"].includes(format)) {
          const e = Error("Formato inválido.");
          e.status = 400;
          throw e;
        }
        const page = Number(url.searchParams.get("page") || 1),
          limit = Number(url.searchParams.get("limit") || 25);
        if (
          !Number.isSafeInteger(page) ||
          page < 1 ||
          !Number.isSafeInteger(limit) ||
          limit < 1 ||
          limit > 100
        ) {
          const e = Error("Paginação inválida.");
          e.status = 400;
          throw e;
        }
        const entries = filterAudit(state.audit, filters);
        const selected = format
          ? entries
          : entries.slice((page - 1) * limit, page * limit);
        const payload = {
          entries: selected,
          total: entries.length,
          page,
          limit,
          filters,
          timeZone: "America/Sao_Paulo",
          integrity: {
            verified: verifyAudit(state, auditKey),
            count: state.audit.length,
            head: state.auditIntegrity.head,
          },
          actorOptions: [
            ...new Map(
              state.audit
                .filter((e) => e.actorId)
                .map((e) => [
                  e.actorId,
                  { id: e.actorId, name: e.actorName || e.actorId },
                ]),
            ).values(),
          ],
          typeOptions: [...new Set(state.audit.map((e) => e.type))],
        };
        await persist(
          record(structuredClone(state), current, action, context, {
            metadata: {
              filters,
              format: format || null,
              returned: selected.length,
              page,
            },
          }),
        );
        return payload;
      });
      logged = true;
      if (format === "csv")
        return send(200, csvAudit(result.entries), {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="thinkedu-auditoria.csv"',
        });
      if (format === "json")
        return send(200, JSON.stringify(result, null, 2), {
          "Content-Disposition":
            'attachment; filename="thinkedu-auditoria.json"',
        });
      return send(200, result);
    }
    if (route === "/commands" && req.method === "POST") {
      let prepared = null;
      if (body.type === "assistant.ask") {
        const current = state.actors.find((a) => a.id === session.actorId);
        const recent = state.assistantThreads.filter(
          (t) =>
            t.actorId === current.id &&
            Date.now() - new Date(t.createdAt).getTime() < 60000,
        ).length;
        if (recent >= 10) {
          const e = Error("Aguarde um minuto antes de enviar novas perguntas.");
          e.status = 429;
          throw e;
        }
        prepared = await prepareAssistantAnswer(
          visibleState(state, current),
          body,
          new Date().toISOString(),
        );
      }
      const result = await serial(async () => {
        try {
          const current = state.actors.find((a) => a.id === session.actorId);
          const currentView = visibleState(state, current);
          const trustedAnswer =
            prepared &&
            prepared.fingerprint === assistantFingerprint(currentView)
              ? prepared.answer
              : undefined;
          const next = applyCommand(
            state,
            current,
            body,
            undefined,
            undefined,
            { assistantAnswer: trustedAnswer },
          );
          const entry = next.audit.at(-1);
          Object.assign(entry, {
            source: context.source,
            requestId: context.requestId,
            method: context.method,
            path: context.path,
          });
          await persist(next);
          return visibleState(
            state,
            state.actors.find((a) => a.id === current.id),
          );
        } catch (e) {
          await persist(
            record(
              structuredClone(state),
              state.actors.find((a) => a.id === session.actorId),
              action,
              context,
              {
                outcome: [401, 403].includes(e.status) ? "denied" : "failed",
                error: e.status ? e.message : "Falha interna.",
                subject:
                  typeof (
                    body.userId ||
                    body.childId ||
                    body.noticeId ||
                    body.activityId
                  ) === "string"
                    ? (
                        body.userId ||
                        body.childId ||
                        body.noticeId ||
                        body.activityId
                      ).slice(0, 100)
                    : null,
              },
            ),
          );
          logged = true;
          throw e;
        }
      });
      logged = true;
      return send(200, result);
    }
    const e = Error("Rota não encontrada.");
    e.status = 404;
    throw e;
  } catch (e) {
    if (!logged)
      try {
        await log(actor, action, context, {
          outcome: [401, 403].includes(e.status) ? "denied" : "failed",
          error: e.status ? e.message : "Falha interna.",
        });
      } catch {
        return send(503, {
          error:
            "Não foi possível registrar a auditoria. A operação não será concluída.",
        });
      }
    return send(e.status || 500, {
      error: e.status ? e.message : "Falha ao processar solicitação.",
      requestId: context.requestId,
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
