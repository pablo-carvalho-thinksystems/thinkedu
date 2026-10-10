import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyAudit } from "../apps/api/audit-store.mjs";
test("API com 320 alunos: 20 professores simultâneos, leitura por unidade e persistência íntegra", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "thinkedu-scale-")),
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
      child.stderr.on("data", (d) => t.diagnostic(String(d)));
      child.stdout.on("data", (d) => {
        const match = String(d).match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve(`http://127.0.0.1:${match[1]}`);
        }
      });
    });
    const request = async (path, token, body) => {
      const start = performance.now();
      const res = await fetch(base + path, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          "X-ThinkEdu-Client": "app",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json();
      return { status: res.status, data, ms: performance.now() - start };
    };
    const login = async (id) => {
      const r = await request("/demo/session", null, { actorId: id });
      assert.equal(r.status, 200);
      return r.data.token;
    };
    const admin = await login("administracao");
    const fixture = await request("/commands", admin, {
      type: "demo.populate",
    });
    assert.equal(fixture.status, 200);
    assert.equal(fixture.data.children.length, 320);
    const s = fixture.data;
    const teachers = await Promise.all(
      s.classes.map(async (g) => ({
        g,
        token: await login(`professor-${g.id}`),
        kid: s.children.find((c) => c.classId === g.id),
      })),
    );
    const start = performance.now();
    const writes = await Promise.all(
      teachers.map(({ token, kid }) =>
        request("/commands", token, {
          type: "attendance.save",
          childId: kid.id,
          date: "2026-10-10",
          status: "present",
          arrival: "08:15",
          departure: null,
          note: "Teste simultâneo: registro preservado.",
        }),
      ),
    );
    for (const r of writes) {
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.children.length, 16);
      assert.ok(r.data.attendance.some((a) => a.date === "2026-10-10"));
    }
    const reads = await Promise.all(
      teachers.flatMap(({ token }) =>
        Array.from({ length: 2 }, () => request("/state", token)),
      ),
    );
    for (const r of reads) {
      assert.equal(r.status, 200);
      assert.equal(r.data.children.length, 16);
      assert.ok(
        r.data.messages.every((m) =>
          r.data.children.some((c) => c.id === m.childId),
        ),
      );
    }
    const units = await Promise.all(
      s.units.map(async (u) => {
        const token = await login(`coordenacao-${u.id}`);
        return request("/state", token);
      }),
    );
    for (const r of units) {
      assert.equal(r.status, 200);
      assert.equal(r.data.children.length, 80);
      assert.equal(r.data.classes.length, 5);
      assert.equal(r.data.units.length, 1);
    }
    const denied = await request("/commands", teachers[0].token, {
      type: "message.send",
      childId: teachers[1].kid.id,
      body: "Fora da turma",
    });
    assert.equal(denied.status, 403);
    const final = await request("/state", admin);
    assert.equal(
      final.data.attendance.filter((a) => a.date === "2026-10-10").length,
      20,
    );
    assert.equal(final.data.children.length, 320);
    const saved = JSON.parse(await readFile(file, "utf8")),
      key = await readFile(file + ".audit.key");
    assert.ok(verifyAudit(saved, key));
    assert.equal(
      saved.audit.filter(
        (a) => a.type === "attendance.save" && a.outcome === "succeeded",
      ).length,
      20,
    );
    assert.ok(
      saved.audit.some(
        (a) => a.type === "message.send" && a.outcome === "denied",
      ),
    );
    const ms = [...writes, ...reads].map((r) => r.ms).sort((a, b) => a - b);
    t.diagnostic(
      JSON.stringify({
        requests: writes.length + reads.length,
        concurrency: 20,
        elapsedMs: Math.round(performance.now() - start),
        p50Ms: Math.round(ms[Math.floor(ms.length * 0.5)]),
        p95Ms: Math.round(ms[Math.floor(ms.length * 0.95)]),
        students: 320,
        classes: 20,
      }),
    );
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
