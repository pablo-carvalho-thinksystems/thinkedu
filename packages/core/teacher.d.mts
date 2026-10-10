import type { Store, Child, Attendance, LearningActivity } from "./model.mjs";
export function seedTeacherDay(): {
  attendance: Attendance[];
  activities: LearningActivity[];
};
export function classroomDay(
  state: Pick<Store, "attendance" | "routines" | "activities">,
  children: Child[],
  date: string,
): {
  attendance: Attendance[];
  routines: Store["routines"];
  activities: LearningActivity[];
  present: number;
  absent: number;
  left: number;
  unchecked: number;
  published: number;
  drafts: number;
  pendingRoutines: number;
};
export function attendanceLabel(record?: Attendance): string;
