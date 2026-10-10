export interface SchoolUnit {
  id: string;
  schoolId: string;
  name: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
  };
}
export interface Classroom {
  id: string;
  unitId: string;
  name: string;
  capacity: number;
}
export interface Child {
  unitId?: string;
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
  active?: boolean;
  auditAccess?: boolean;
  unitIds?: string[];
}
export interface Attendance {
  id: string;
  childId: string;
  date: string;
  status: string;
  arrival: string | null;
  departure: string | null;
  note: string;
  updatedAt: string;
}
export interface LearningActivity {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  childIds: string[];
  status: string;
  updatedAt: string;
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
  actorName?: string;
  actorRole?: string;
  schoolId?: string;
  outcome?: string;
  source?: string;
  requestId?: string | null;
  method?: string | null;
  path?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
  legacy?: boolean;
  hash?: string;
  previousHash?: string;
  changes?: {
    collection: string;
    id: string;
    operation: string;
    before: unknown;
    after: unknown;
  }[];
  id: string;
  actorId: string | null;
  type: string;
  at: string;
  subject: string | null;
}
export interface Attachment {
  name: string;
  uri: string;
  mimeType: string;
}
export interface MuralPost {
  id: string;
  title: string;
  body: string;
  kind: string;
  attachment: Attachment | null;
  childIds: string[];
  authorId: string;
  createdAt: string;
}
export function upgradeStore<
  T extends {
    posts?: MuralPost[];
    attendance?: Attendance[];
    activities?: LearningActivity[];
  },
>(
  state: T,
): T & {
  posts: MuralPost[];
  attendance: Attendance[];
  activities: LearningActivity[];
};
export interface Store {
  version: number;
  school: { id: string; name: string };
  units: SchoolUnit[];
  classes: Classroom[];
  children: Child[];
  actors: Actor[];
  routines: Routine[];
  attendance: Attendance[];
  activities: LearningActivity[];
  notices: Notice[];
  messages: Message[];
  invoices: Invoice[];
  events: SchoolEvent[];
  posts: MuralPost[];
  auditAccessRoles: string[];
  audit: AuditEntry[];
}
export interface VisibleStore extends Omit<Store, "actors"> {
  currentActor: Actor;
  actors: {
    id: string;
    name: string;
    role: string;
    childIds?: string[];
    classIds?: string[];
    active?: boolean;
    financial?: boolean;
    schoolId?: string;
    auditAccess?: boolean;
    unitIds?: string[];
  }[];
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
  options?: { allowLocalMedia?: boolean },
): Store;
export function calendarCells(year: number, month: number): (number | null)[];
