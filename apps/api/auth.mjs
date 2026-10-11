import { scryptSync, timingSafeEqual } from "node:crypto";
export function authenticate(accounts, state, email, password) {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 1024
  )
    return null;
  const account = accounts.find(
    (a) => a.email?.toLowerCase() === email.trim().toLowerCase(),
  );
  const salt = account?.salt || "thinkedu-unknown-account";
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(account?.passwordHash || "00".repeat(64), "hex");
  const valid =
    expected.length === derived.length && timingSafeEqual(derived, expected);
  const actor =
    account &&
    state.actors.find(
      (a) =>
        a.id === account.actorId &&
        a.schoolId === state.school.id &&
        a.active !== false,
    );
  return valid && actor ? actor : null;
}
