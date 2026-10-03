export type AutomationTrigger =
  | "task_created"
  | "task_completed"
  | "task_overdue"
  | "task_scheduled"
  | "project_changed"
  | "label_changed";

export type AutomationAction =
  | "create_task"
  | "update_task"
  | "complete_task"
  | "move_task"
  | "add_label"
  | "assign_task"
  | "notify"
  | "webhook";

export interface AutomationRule {
  id: string;
  ownerId: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: Record<string, unknown>[];
  actions: { type: AutomationAction; payload: Record<string, unknown> }[];
  createdAt: string;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  eventId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  attempts: number;
  createdAt: string;
  completedAt?: string;
}

export function canRunAutomation(rule: AutomationRule): boolean {
  return rule.enabled && rule.actions.length > 0;
}
