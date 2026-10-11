import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("MCP oficial: autenticação, ferramentas por família, rejeição de aluno externo e auditoria", async () => {
  const dir = await mkdtemp(join(tmpdir(), "thinkedu-mcp-"));
  const proc = spawn(process.execPath, ["apps/api/start.mjs"], {
    env: {
      ...process.env,
      PORT: "0",
      THINKEDU_DEMO: "true",
      THINKEDU_DATA_FILE: join(dir, "demo.json"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error("API não iniciou")), 10000);
      proc.once("error", reject);
      proc.stdout.on("data", (b) => {
        const m = String(b).match(/http:\/\/127\.0\.0\.1:\d+/);
        if (m) {
          clearTimeout(timeout);
          resolve(m[0]);
        }
      });
    });
    const call = (body, token) =>
      fetch(base + "/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await call({ jsonrpc: "2.0", id: 1, method: "tools/list" })).status,
      401,
    );
    const login = await (
      await fetch(base + "/demo/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: "rafael" }),
      })
    ).json();
    let r = await call(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        },
      },
      login.token,
    );
    assert.equal(r.status, 200);
    const listed = await (
      await call({ jsonrpc: "2.0", id: 2, method: "tools/list" }, login.token)
    ).json();
    assert.ok(listed.result.tools.some((t) => t.name === "family_invoices"));
    const invoices = await (
      await call(
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "family_invoices", arguments: {} },
        },
        login.token,
      )
    ).json();
    assert.equal(invoices.result.isError, undefined);
    const data = JSON.parse(invoices.result.content[0].text);
    assert.ok(data.every((i) => ["lia", "bento"].includes(i.childId)));
    const blocked = await (
      await call(
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "student_routine",
            arguments: { childId: "miguel", date: "2026-10-09" },
          },
        },
        login.token,
      )
    ).json();
    assert.equal(blocked.result.isError, true);
    const asked = await (
      await call(
        {
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "ask_samuca",
            arguments: {
              childId: "lia",
              question: "Vai ter aula em 12/10/2026?",
            },
          },
        },
        login.token,
      )
    ).json();
    assert.equal(JSON.parse(asked.result.content[0].text).status, "waiting");
    const saved = JSON.parse(await readFile(join(dir, "demo.json"), "utf8"));
    assert.ok(
      saved.audit.some((e) => e.type === "mcp.read" && e.outcome === "denied"),
    );
    assert.ok(
      saved.audit.some((e) => e.type === "assistant.ask" && e.source === "mcp"),
    );
  } finally {
    proc.kill();
    await new Promise((r) => proc.once("exit", r));
    await rm(dir, { recursive: true, force: true });
  }
});
