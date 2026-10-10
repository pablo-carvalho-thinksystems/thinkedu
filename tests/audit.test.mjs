import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  upgradeStore,
  applyCommand,
  visibleState,
} from "../packages/core/model.mjs";
import {
  safeSnapshot,
  csvAudit,
  makeAuditEntry,
  filterAudit,
} from "../packages/core/audit.mjs";
import { effectiveActor, can } from "../packages/core/permissions.mjs";
import { sealAudit, verifyAudit } from "../apps/api/audit-store.mjs";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const actor = (s, id) => s.actors.find((a) => a.id === id);
test("auditoria preserva identidade, antes/depois e concessões somente pela Administração", () => {
  let s = upgradeStore(createSeed());
  const admin = actor(s, "administracao"),
    direction = actor(s, "direcao");
  assert.equal(can(direction, "audit.read"), false);
  assert.throws(
    () =>
      applyCommand(s, direction, {
        type: "audit.access",
        role: "coordinator",
        allowed: true,
      }),
    { status: 403 },
  );
  assert.throws(
    () =>
      applyCommand(s, direction, {
        type: "user.create",
        name: "Admin",
        role: "administrator",
        active: true,
        classIds: [],
      }),
    { status: 403 },
  );
  s = applyCommand(s, admin, {
    type: "audit.access",
    role: "coordinator",
    allowed: true,
  });
  assert.ok(can(effectiveActor(s, actor(s, "coordenacao")), "audit.read"));
  s = applyCommand(s, admin, {
    type: "audit.access",
    userId: "financeiro",
    allowed: true,
  });
  assert.ok(can(effectiveActor(s, actor(s, "financeiro")), "audit.read"));
  s = applyCommand(s, admin, {
    type: "user.update",
    userId: "financeiro",
    name: "Novo nome",
    role: "finance",
    active: true,
    classIds: [],
  });
  const event = s.audit.at(-1);
  assert.equal(event.actorName, "Administração");
  const diff = event.changes.find((c) => c.collection === "actors");
  assert.equal(diff.before.name, "Bruno · Financeiro");
  assert.equal(diff.after.name, "Novo nome");
  assert.equal(s.audit[0].changes[0].collection, "auditAccessRoles");
  s = applyCommand(s, admin, {
    type: "audit.access",
    role: "coordinator",
    allowed: false,
  });
  assert.equal(visibleState(s, actor(s, "coordenacao")).audit.length, 0);
  assert.throws(
    () =>
      applyCommand(s, admin, {
        type: "user.update",
        userId: admin.id,
        name: admin.name,
        role: "finance",
        active: true,
        classIds: [],
      }),
    { status: 409 },
  );
});
test("cadeia assinada detecta edição, exclusão, reordenação e chave incorreta", () => {
  const s = upgradeStore(createSeed()),
    key = Buffer.alloc(32, 7);
  const a = actor(s, "administracao");
  for (let i = 0; i < 3; i++)
    s.audit.push(
      makeAuditEntry(s, a, {
        id: `e-${i}`,
        type: "state.read",
        at: "2026-10-10T12:00:00Z",
      }),
    );
  sealAudit(s, key);
  assert.ok(verifyAudit(s, key));
  for (const mutate of [
    (t) => {
      t.audit[0].actorName = "Alterado";
    },
    (t) => t.audit.pop(),
    (t) => t.audit.reverse(),
    (t) => {
      delete t.auditIntegrity;
    },
  ]) {
    const t = structuredClone(s);
    mutate(t);
    assert.equal(verifyAudit(t, key), false);
  }
  assert.equal(verifyAudit(s, Buffer.alloc(32, 8)), false);
});
test("auditoria não armazena credenciais e a exportação neutraliza fórmulas", () => {
  assert.deepEqual(
    safeSnapshot({
      name: "Nome",
      token: "secreto",
      nested: { password: "secreto", access_token: "secreto", ok: true },
    }),
    { name: "Nome", nested: { ok: true } },
  );
  const s = createSeed(),
    e = makeAuditEntry(
      s,
      { ...actor(s, "direcao"), name: '=HYPERLINK("bad")' },
      {
        id: "e",
        type: "state.read",
        at: "2026-10-10T02:30:00Z",
        metadata: { token: "secret", safe: "ok" },
      },
    );
  assert.deepEqual(e.metadata, { safe: "ok" });
  assert.ok(csvAudit([e]).includes("'=HYPERLINK"));
  assert.equal(
    filterAudit([e], { from: "2026-10-09", to: "2026-10-09" }).length,
    1,
  );
  assert.equal(filterAudit([e], { from: "2026-10-10" }).length, 0);
});
test("API audita acesso negado, consulta, exportação, concessão e encerramento de sessão", async () => {
  const dir = await mkdtemp(join(tmpdir(), "thinkedu-audit-")),
    file = join(dir, "demo.json");
  const child = spawn(process.execPath, ["apps/api/start.mjs"], {
    env: {
      ...process.env,
      PORT: "0",
      THINKEDU_DEMO: "true",
      THINKEDU_DATA_FILE: file,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error("API não iniciou")), 10000);
      child.once("error", reject);
      child.stdout.on("data", (d) => {
        const m = String(d).match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (m) {
          clearTimeout(timer);
          resolve(`http://127.0.0.1:${m[1]}`);
        }
      });
    });
    const req = (path, token, body) =>
      fetch(base + path, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          "X-ThinkEdu-Client": "web",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const login = async (id) =>
      (await (await req("/demo/session", null, { actorId: id })).json()).token;
    const admin = await login("administracao"),
      director = await login("direcao"),
      coord = await login("coordenacao");
    assert.equal((await req("/audit", director)).status, 403);
    assert.equal(
      (
        await req("/commands", admin, {
          type: "audit.access",
          role: "coordinator",
          allowed: true,
        })
      ).status,
      200,
    );
    assert.equal((await req("/audit", coord)).status, 200);
    const data = await (await req("/audit?limit=2", admin)).json();
    assert.equal(data.entries.length, 2);
    assert.ok(data.integrity.verified);
    const exported = await req("/audit?format=csv", admin);
    assert.equal(exported.status, 200);
    assert.ok((await exported.text()).includes("Quando"));
    assert.equal(
      (
        await req("/commands", director, {
          type: "message.send",
          childId: "unknown",
          body: "Negada",
        })
      ).status,
      403,
    );
    assert.equal((await req("/session/logout", director, {})).status, 200);
    assert.equal((await req("/state", director)).status, 401);
    const extra = await login("secretaria");
    assert.equal(
      (
        await fetch(base + "/session/logout", {
          method: "POST",
          headers: { Authorization: "Bearer " + extra },
        })
      ).status,
      200,
    );
    assert.equal((await req("/state", extra)).status, 401);
    const saved = JSON.parse(await readFile(file, "utf8"));
    for (const type of [
      "session.login",
      "session.logout",
      "session.rejected",
      "audit.read",
      "audit.export",
      "audit.access",
    ])
      assert.ok(
        saved.audit.some((e) => e.type === type),
        type,
      );
    assert.ok(
      saved.audit.some(
        (e) => e.type === "message.send" && e.outcome === "denied",
      ),
    );
    assert.ok(saved.audit.every((e) => e.requestId && e.actorName));
    assert.ok(verifyAudit(saved, await readFile(file + ".audit.key")));
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
