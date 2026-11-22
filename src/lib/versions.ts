import type { ProjectVersion } from '@/types/project';

/**
 * Human-readable label for a version. Named versions win, then auto-saves,
 * then the plain version number.
 */
export const formatVersionName = (version: ProjectVersion) => {
  if (version.name) return version.name;
  if (version.is_auto_save) return `Auto-save #${version.version_number}`;
  return `Version #${version.version_number}`;
};
