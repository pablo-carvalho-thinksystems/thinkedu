import type { MuralPost, SchoolEvent, Attachment } from "./model.mjs";
export function seedPosts(): MuralPost[];
export function eventsForChild(
  events: SchoolEvent[],
  childId?: string,
): SchoolEvent[];
export function validateAttachment(
  value: unknown,
  kind: string,
  allowLocal?: boolean,
): Attachment | null;
