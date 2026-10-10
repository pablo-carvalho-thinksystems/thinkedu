import type { Actor, Store } from "./model.mjs";
export const roleLabels: Record<string, string>;
export const staffRoles: string[];
export const rolePermissions: Record<string, string[]>;
export function canonicalRole(role: string): string;
export function can(
  actor: Partial<Actor> | undefined,
  permission: string,
): boolean;
export function effectiveActor(state: Store, actor: Actor): Actor;
export function seedStaff(schoolId?: string): Actor[];
