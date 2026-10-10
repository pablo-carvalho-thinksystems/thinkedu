import type { Actor, Store, AuditEntry } from "./model.mjs";
export interface AuditFilters {
  from?: string;
  to?: string;
  actorId?: string;
  type?: string;
  outcome?: string;
  source?: string;
  search?: string;
}
export const auditLabels: Record<string, string>;
export const collectionLabels: Record<string, string>;
export function safeSnapshot<T>(value: T): T;
export function stableJSON(value: unknown): string;
export function stateChanges(
  before: Store,
  after: Store,
): NonNullable<AuditEntry["changes"]>;
export function makeAuditEntry(
  state: Store,
  actor: Actor | null,
  options: Record<string, unknown>,
): AuditEntry;
export function auditDay(at: string): string;
export function auditTime(at: string): string;
export function filterAudit(
  entries: AuditEntry[],
  filters?: AuditFilters,
): AuditEntry[];
export function csvAudit(entries: AuditEntry[]): string;
