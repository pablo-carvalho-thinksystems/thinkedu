import { createHmac, timingSafeEqual } from "node:crypto";
import { stableJSON } from "../../packages/core/audit.mjs";
const sign = (value, key) =>
  createHmac("sha256", key).update(stableJSON(value)).digest("hex");
const equal = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
function content(entry) {
  const { hash, previousHash, ...rest } = entry;
  return rest;
}
export function sealAudit(state, key) {
  let previousHash = "0";
  state.audit = state.audit.map((entry) => {
    const hash = sign({ previousHash, entry: content(entry) }, key);
    if (
      entry.hash &&
      (!equal(entry.hash, hash) || entry.previousHash !== previousHash)
    )
      throw Error("Integridade do histórico de auditoria inválida.");
    const sealed = { ...entry, previousHash, hash };
    previousHash = hash;
    return sealed;
  });
  const head = {
    version: 1,
    schoolId: state.school.id,
    count: state.audit.length,
    head: previousHash,
  };
  state.auditIntegrity = { ...head, signature: sign(head, key) };
  return state;
}
export function verifyAudit(state, key) {
  if (!state.auditIntegrity) return false;
  try {
    let previousHash = "0";
    for (const entry of state.audit) {
      if (
        entry.previousHash !== previousHash ||
        !equal(entry.hash, sign({ previousHash, entry: content(entry) }, key))
      )
        return false;
      previousHash = entry.hash;
    }
    const head = {
      version: 1,
      schoolId: state.school.id,
      count: state.audit.length,
      head: previousHash,
    };
    return (
      head.count === state.auditIntegrity.count &&
      head.head === state.auditIntegrity.head &&
      equal(state.auditIntegrity.signature, sign(head, key))
    );
  } catch {
    return false;
  }
}
