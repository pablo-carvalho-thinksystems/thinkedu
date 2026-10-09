export interface Child {
  id: string;
  name: string;
  classId: string;
  group: string;
  initials: string;
  tone: string;
  arrival: string;
}
export interface Actor {
  id: string;
  name: string;
  role: string;
  schoolId: string;
  childIds: string[];
  classIds: string[];
  financial: boolean;
}
export interface Routine {
  id: string;
  childId: string;
  date: string;
  meal: string;
  sleep: number;
  hygiene: string;
  mood: string;
  note: string;
  published: boolean;
  updatedAt: string;
}
export interface Response {
  childId: string;
  actorId: string;
  answer: string;
  at: string;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  type: string;
  childIds: string[];
  due: string | null;
  createdAt: string;
  readBy: string[];
  responses: Response[];
}
export interface Message {
  id: string;
  childId: string;
  senderId: string;
  body: string;
  createdAt: string;
}
export interface Invoice {
  id: string;
  childId: string;
  reference: string;
  amount: number;
  due: string;
  status: string;
}
export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  childIds: string[];
  noticeId: string | null;
  tone: string;
}
export interface AuditEntry {
  id: string;
  actorId: string;
  type: string;
  at: string;
  subject: string | null;
}
export interface Store {
  version: number;
  school: { id: string; name: string };
  children: Child[];
  actors: Actor[];
  routines: Routine[];
  notices: Notice[];
  messages: Message[];
  invoices: Invoice[];
  events: SchoolEvent[];
  audit: AuditEntry[];
}
export interface VisibleStore extends Omit<Store, "actors"> {
  actors: { id: string; name: string; role: string }[];
}
export const DEMO_DATE: string;
export function money(value: number): string;
export function createSeed(): Store;
export function accessibleChildren(state: Store, actor: Actor): Child[];
export function visibleState(state: Store, actor: Actor): VisibleStore;
export function applyCommand(
  state: Store,
  actor: Actor,
  command: Record<string, unknown>,
  now?: string,
  id?: () => string,
): Store;
export function calendarCells(year: number, month: number): (number | null)[];
