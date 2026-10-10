import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("API: sessão, isolamento, comandos e persistência entre perfis", async () => {
  const dir = await mkdtemp(join(tmpdir(), "thinkedu-test-"));
  const child = spawn(process.execPath, ["apps/api/start.mjs"], {
    env: {
      ...process.env,
      PORT: "0",
      THINKEDU_DEMO: "true",
      THINKEDU_DATA_FILE: join(dir, "demo.json"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    // The API reports its actual bound port when PORT=0.
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("API não iniciou")),
        10000,
      );
      child.once("error", reject);
      child.stdout.on("data", (chunk) => {
        const match = String(chunk).match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(`http://127.0.0.1:${match[1]}`);
        }
      });
    });
    const request = (path, token, body, origin) =>
      fetch(base + path, {
        method: body ? "POST" : "GET",
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(origin ? { Origin: origin } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal((await request("/state")).status, 401);
    assert.equal((await request("/app/version?platform=desktop")).status, 400);
    const release = await (await request("/app/version?platform=ios")).json();
    assert.equal(release.enabled, false);
    assert.equal(release.storeUrl, "");
    assert.equal(
      (await request("/health", null, null, "https://untrusted.example"))
        .status,
      403,
    );
    const login = async (actorId) =>
      (await (await request("/demo/session", null, { actorId })).json()).token;
    const family = await login("rafael"),
      teacher = await login("ana");
    const finance = await login("financeiro"),
      secretary = await login("secretaria"),
      coordination = await login("coordenacao"),
      direction = await login("direcao");
    const financeData = await (await request("/state", finance)).json();
    assert.equal(financeData.invoices.length, 3);
    assert.deepEqual(financeData.routines, []);
    assert.deepEqual(financeData.messages, []);
    assert.deepEqual(
      (await (await request("/state", secretary)).json()).routines,
      [],
    );
    assert.deepEqual(
      (await (await request("/state", coordination)).json()).invoices,
      [],
    );
    assert.equal(
      (
        await request("/commands", teacher, {
          type: "user.create",
          name: "Novo",
          role: "director",
          active: true,
          classIds: [],
        })
      ).status,
      403,
    );
    const changed = await request("/commands", direction, {
      type: "user.update",
      userId: "financeiro",
      name: "Bruno",
      role: "finance",
      active: false,
      classIds: [],
    });
    assert.equal(changed.status, 200);
    assert.equal((await request("/state", finance)).status, 401);
    assert.equal(
      (await request("/demo/session", null, { actorId: "financeiro" })).status,
      403,
    );
    const data = await (await request("/state", family)).json();
    assert.deepEqual(
      data.children.map((c) => c.id),
      ["lia", "bento"],
    );
    assert.equal(
      (
        await request("/commands", family, {
          type: "message.send",
          childId: "miguel",
          body: "Não permitido",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/commands", teacher, {
          type: "message.send",
          childId: "lia",
          body: "Mensagem de teste da educadora",
        })
      ).status,
      200,
    );
    const updated = await (await request("/state", family)).json();
    assert.equal(
      updated.messages.at(-1).body,
      "Mensagem de teste da educadora",
    );
    assert.equal(
      (
        await request("/commands", family, {
          type: "mural.create",
          title: "Recado",
          body: "Texto",
          childIds: ["lia"],
          kind: "text",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/commands", teacher, {
          type: "mural.create",
          title: "Material local",
          body: "Arquivo",
          childIds: ["lia"],
          kind: "file",
          attachment: {
            name: "Teste.txt",
            uri: "local:1791532800000-test.txt",
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/commands", teacher, {
          type: "mural.create",
          title: "Mural de teste",
          body: "Material para Bento",
          childIds: ["bento"],
          kind: "file",
          attachment: {
            name: "Teste.pdf",
            uri: "https://example.com/test.pdf",
          },
        })
      ).status,
      200,
    );
    const wall = await (await request("/state", family)).json();
    assert.equal(wall.posts[0].title, "Mural de teste");
    assert.deepEqual(wall.posts[0].childIds, ["bento"]);
    const saved = JSON.parse(await readFile(join(dir, "demo.json"), "utf8"));
    assert.equal(saved.messages.at(-1).body, "Mensagem de teste da educadora");
    assert.equal(saved.audit.at(-1).type, "mural.create");
    assert.equal(saved.posts[0].title, "Mural de teste");
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
