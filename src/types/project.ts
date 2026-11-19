import type { Edge, Node, Viewport } from '@xyflow/react';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  is_public?: boolean | null;
  share_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  name?: string;
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
  is_auto_save: boolean;
  created_at: string;
}

export interface SharedProjectData {
  project: Project;
  versions: ProjectVersion[];
}
