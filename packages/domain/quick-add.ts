export interface QuickAddCommand {
  title: string;
  projectName?: string;
  sectionName?: string;
  labels: string[];
  priority?: 1 | 2 | 3 | 4;
  assigneeUserId?: string;
  dueText?: string;
  recurrenceText?: string;
}

export function validateQuickAddCommand(command: QuickAddCommand): string[] {
  const errors: string[] = [];
  if (!command.title.trim()) errors.push("Task title is required");
  if (command.title.length > 500) errors.push("Task title is too long");
  return errors;
}
