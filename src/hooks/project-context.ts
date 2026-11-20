import { createContext, useContext } from 'react';
import type { useProjectPersistence } from './useProjectPersistence';

export type ProjectContextValue = ReturnType<typeof useProjectPersistence>;

export const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
