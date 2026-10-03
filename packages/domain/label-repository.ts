import type { Label } from "./labels";

export interface LabelRepository {
  create(label: Label): Promise<Label>;
  list(userId: string): Promise<Label[]>;
  delete(id: string, userId: string): Promise<void>;
}

export class InMemoryLabelRepository implements LabelRepository {
  private readonly labels = new Map<string, Label>();

  async create(label: Label) { this.labels.set(label.id, label); return label; }
  async list(userId: string) { return [...this.labels.values()].filter((label) => label.userId === userId); }
  async delete(id: string, userId: string) {
    const label = this.labels.get(id);
    if (label?.userId === userId) this.labels.delete(id);
  }
}
