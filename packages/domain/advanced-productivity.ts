export type PlanningHorizon = "daily" | "weekly" | "monthly" | "quarterly";

export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  startedAt: string;
  endedAt?: string;
}

export interface ReviewPlan {
  id: string;
  userId: string;
  horizon: PlanningHorizon;
  scheduledAt: string;
  completedAt?: string;
}

export interface CapacityWindow {
  userId: string;
  startAt: string;
  endAt: string;
  availableMinutes: number;
}

export function isValidCapacity(window: CapacityWindow): boolean {
  return window.availableMinutes >= 0 &&
    new Date(window.endAt).getTime() >= new Date(window.startAt).getTime();
}
