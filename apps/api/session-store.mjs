import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
const duration = 30 * 86400000;
const digest = (token) =>
  createHash("sha256")
    .update(token || "")
    .digest("hex");
export class SessionStore {
  constructor(path) {
    this.path = path;
    try {
      this.entries = new Map(JSON.parse(readFileSync(path, "utf8")));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      this.entries = new Map();
    }
  }
  persist() {
    for (const [k, v] of this.entries)
      if (v.expires < Date.now()) this.entries.delete(k);
    writeFileSync(this.path + ".tmp", JSON.stringify([...this.entries]), {
      mode: 0o600,
    });
    renameSync(this.path + ".tmp", this.path);
  }
  set(token, session) {
    this.entries.set(digest(token), {
      ...session,
      expires: Date.now() + duration,
    });
    this.persist();
  }
  get(token) {
    if (!token) return undefined;
    const key = digest(token),
      session = this.entries.get(key);
    if (!session) return undefined;
    if (session.expires < Date.now()) {
      this.entries.delete(key);
      this.persist();
      return undefined;
    }
    if (session.expires - Date.now() < duration - 86400000) {
      session.expires = Date.now() + duration;
      this.persist();
    }
    return session;
  }
  delete(token) {
    this.entries.delete(digest(token));
    this.persist();
  }
}
