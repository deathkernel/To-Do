import type { Project, Section } from "./project";

export interface ProjectRepository {
  createProject(project: Project): Promise<Project>;
  listProjects(userId: string): Promise<Project[]>;
  createSection(section: Section): Promise<Section>;
  listSections(projectId: string, userId: string): Promise<Section[]>;
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();
  private readonly sections = new Map<string, Section>();

  async createProject(project: Project) { this.projects.set(project.id, project); return project; }
  async listProjects(userId: string) { return [...this.projects.values()].filter((p) => p.userId === userId); }
  async createSection(section: Section) { this.sections.set(section.id, section); return section; }
  async listSections(projectId: string, userId: string) {
    const project = [...this.projects.values()].find((p) => p.id === projectId && p.userId === userId);
    return project ? [...this.sections.values()].filter((s) => s.projectId === projectId) : [];
  }
}
