import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { SessionStore } from "../apps/api/session-store.mjs";
test("session survives restart without storing raw token; logout revokes it", () => {
  const dir = mkdtempSync(tmpdir() + "/thinkedu-session-");
  try {
    const path = dir + "/sessions.json",
      store = new SessionStore(path);
    store.set("secret-token", { actorId: "rafael" });
    assert.ok(!readFileSync(path, "utf8").includes("secret-token"));
    const restarted = new SessionStore(path);
    assert.equal(restarted.get("secret-token").actorId, "rafael");
    assert.equal(restarted.get("other"), undefined);
    restarted.delete("secret-token");
    assert.equal(new SessionStore(path).get("secret-token"), undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("expired sessions cannot be restored", () => {
  const dir = mkdtempSync(tmpdir() + "/thinkedu-expired-");
  try {
    const store = new SessionStore(dir + "/sessions.json");
    store.set("expired", { actorId: "rafael" });
    for (const session of store.entries.values())
      session.expires = Date.now() - 1;
    assert.equal(store.get("expired"), undefined);
    assert.equal(
      new SessionStore(dir + "/sessions.json").get("expired"),
      undefined,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
