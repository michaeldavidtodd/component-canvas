import type { ReactNode } from 'react';
import { useProjectPersistence } from './useProjectPersistence';
import { ProjectContext } from './project-context';

/**
 * Owns the single instance of project state for the app. Consumers should use
 * `useProject()` instead of calling `useProjectPersistence()` directly so the
 * dock, canvas, and version history always agree on the active project.
 */
export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const value = useProjectPersistence();

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};
