import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, Copy, FolderOpen, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/hooks/project-context';
import type { Project } from '@/types/project';

interface ProjectBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProjectSummary {
  versionCount: number;
  latestVersionAt: string | null;
}

/**
 * Lists every project in the account so the user can see what exists and switch
 * between projects. Version counts and last-saved times are fetched in one
 * query when the dialog opens.
 */
export const ProjectBrowser = ({ open, onOpenChange }: ProjectBrowserProps) => {
  const {
    projects,
    currentProject,
    loading,
    selectProject,
    createProject,
    saveVersion,
    updateProject,
    deleteProject,
    duplicateProject,
  } = useProject();

  const [query, setQuery] = useState('');
  const [summaries, setSummaries] = useState<Record<string, ProjectSummary>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesLoaded, setSummariesLoaded] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [startFromCurrent, setStartFromCurrent] = useState(false);
  // Only show the loading state on the first load. Later refreshes happen in the
  // background so deleting or creating a project doesn't flash the list.
  const hasLoadedSummariesRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    if (projects.length === 0) {
      setSummaries({});
      setSummariesLoaded(true);
      hasLoadedSummariesRef.current = true;
      return;
    }

    let cancelled = false;

    const loadSummaries = async () => {
      if (!hasLoadedSummariesRef.current) {
        setSummariesLoading(true);
      }
      try {
        const { data, error } = await supabase
          .from('project_versions')
          .select('project_id, created_at')
          .in('project_id', projects.map((project) => project.id));

        if (error) throw error;
        if (cancelled) return;

        const next: Record<string, ProjectSummary> = {};
        for (const row of data ?? []) {
          const summary = next[row.project_id] ?? { versionCount: 0, latestVersionAt: null };
          summary.versionCount += 1;
          if (!summary.latestVersionAt || row.created_at > summary.latestVersionAt) {
            summary.latestVersionAt = row.created_at;
          }
          next[row.project_id] = summary;
        }
        setSummaries(next);
      } catch (error) {
        console.error('Error loading project summaries:', error);
      } finally {
        if (!cancelled) {
          setSummariesLoading(false);
          setSummariesLoaded(true);
          hasLoadedSummariesRef.current = true;
        }
      }
    };

    loadSummaries();

    return () => {
      cancelled = true;
    };
  }, [open, projects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return projects;

    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(normalizedQuery) ||
        (project.description ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [projects, query]);

  const handleOpenProject = async (project: Project) => {
    if (project.id === currentProject?.id) {
      onOpenChange(false);
      return;
    }

    setOpeningId(project.id);
    try {
      await selectProject(project);
      onOpenChange(false);
    } finally {
      setOpeningId(null);
    }
  };

  const resetCreateForm = () => {
    setShowCreate(false);
    setNewName('');
    setNewDescription('');
    setStartFromCurrent(false);
  };

  const handleToggleCreate = () => {
    if (showCreate) {
      resetCreateForm();
    } else {
      setShowCreate(true);
    }
  };

  const handleCreateProject = async () => {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      if (startFromCurrent && currentProject) {
        const duplicate = await duplicateProject(currentProject.id, {
          name,
          description: newDescription.trim() || undefined,
        });
        if (duplicate) {
          resetCreateForm();
          onOpenChange(false);
        }
        return;
      }

      const project = await createProject(name, newDescription.trim() || undefined);
      if (project) {
        // Seed a version so the new project opens deterministically instead of
        // inheriting what's currently on the canvas.
        const version = await saveVersion(project.id, [], [], undefined, 'Initial version', false);
        if (!version) {
          // Roll back so a failed create doesn't leave an empty project behind.
          await deleteProject(project.id, { silent: true });
          return;
        }
        resetCreateForm();
        onOpenChange(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    setDuplicatingId(project.id);
    try {
      const duplicate = await duplicateProject(project.id);
      if (duplicate) {
        onOpenChange(false);
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeleting(true);
    try {
      const deleted = await deleteProject(projectToDelete.id);
      if (deleted) {
        setProjectToDelete(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleStartRename = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
  };

  const handleSaveRename = async (project: Project) => {
    const name = editName.trim();
    if (!name || name === project.name) {
      setEditingId(null);
      return;
    }

    await updateProject(project.id, { name });
    setEditingId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(640px,85vh)] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Projects
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className="pl-8"
            />
          </div>
          <Button onClick={handleToggleCreate} className="gap-2" disabled={duplicatingId !== null}>
            <Plus className="size-4" />
            New project
          </Button>
        </div>

        {showCreate && (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-2 rounded-lg border border-border p-3 duration-200">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Project name"
              aria-label="Project name"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateProject();
              }}
            />
            <Input
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Description (optional)"
              aria-label="Project description"
            />
            {currentProject && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="start-from-current"
                  checked={startFromCurrent}
                  onCheckedChange={(checked) => setStartFromCurrent(checked === true)}
                />
                <Label htmlFor="start-from-current" className="text-sm font-normal">
                  Copy versions from “{currentProject.name}”
                </Label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetCreateForm} disabled={creating}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateProject} disabled={!newName.trim() || creating || duplicatingId !== null}>
                {creating ? <Loader2 className="size-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1">
          <div className="min-h-full space-y-2 pr-3">
            {loading || summariesLoading || !summariesLoaded ? (
              <div className="flex h-full items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading projects…
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <FolderOpen className="mb-2 h-10 w-10 opacity-50" />
                <p>{projects.length === 0 ? 'No projects yet' : 'No projects match your search'}</p>
                {projects.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setShowCreate(true)}>
                    <Plus className="size-4" />
                    Create your first project
                  </Button>
                )}
              </div>
            ) : (
              filteredProjects.map((project) => {
                const summary = summaries[project.id];
                const isActive = project.id === currentProject?.id;
                const isEditing = editingId === project.id;

                return (
                  <div
                    key={project.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        }`}
                      >
                        <FolderOpen className="size-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') handleSaveRename(project);
                                if (event.key === 'Escape') setEditingId(null);
                              }}
                              aria-label="Project name"
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveRename(project)}
                              disabled={!editName.trim()}
                              aria-label="Save name"
                            >
                              <Check className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{project.name}</span>
                            {isActive && (
                              <Badge variant="secondary" className="text-xs">
                                Active
                              </Badge>
                            )}
                            {project.is_public && (
                              <Badge variant="outline" className="text-xs">
                                Shared
                              </Badge>
                            )}
                          </div>
                        )}

                        {project.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{project.description}</p>
                        )}

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
                          <span>•</span>
                          <span>
                            {summary
                              ? `${summary.versionCount} version${summary.versionCount === 1 ? '' : 's'}`
                              : 'No versions'}
                          </span>
                          {summary?.latestVersionAt && (
                            <>
                              <span>•</span>
                              <span>
                                Last saved {formatDistanceToNow(new Date(summary.latestVersionAt), { addSuffix: true })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleStartRename(project)}
                          disabled={duplicatingId !== null}
                          aria-label={`Rename ${project.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDuplicateProject(project)}
                          disabled={duplicatingId !== null}
                          aria-label={`Duplicate ${project.name}`}
                        >
                          {duplicatingId === project.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setProjectToDelete(project)}
                          disabled={duplicatingId !== null}
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant={isActive ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleOpenProject(project)}
                          disabled={openingId === project.id || duplicatingId !== null}
                        >
                          {openingId === project.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isActive ? (
                            'Current'
                          ) : (
                            'Open'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setProjectToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              “{projectToDelete?.name}” and all of its versions will be permanently deleted. Any share link will stop
              working. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteProject();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
