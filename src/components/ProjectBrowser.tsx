import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, FolderOpen, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  useEffect(() => {
    if (!open) return;

    if (projects.length === 0) {
      setSummaries({});
      setSummariesLoaded(true);
      return;
    }

    let cancelled = false;

    const loadSummaries = async () => {
      setSummariesLoading(true);
      setSummariesLoaded(false);
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

  const handleCreateProject = async () => {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const project = await createProject(name, newDescription.trim() || undefined);
      if (project) {
        // Seed a version so the new project opens deterministically instead of
        // inheriting whatever is currently on the canvas.
        await saveVersion(project.id, [], [], undefined, 'Initial version', false);
        setShowCreate(false);
        setNewName('');
        setNewDescription('');
        onOpenChange(false);
      }
    } finally {
      setCreating(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Projects
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              className="pl-8"
            />
          </div>
          <Button onClick={() => setShowCreate((value) => !value)} className="gap-2">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>

        {showCreate && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Project name"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateProject();
              }}
            />
            <Input
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Description (optional)"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateProject} disabled={!newName.trim() || creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-2 pr-3">
            {loading || summariesLoading || !summariesLoaded ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading projects…
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FolderOpen className="mx-auto mb-2 h-10 w-10 opacity-50" />
                <p>{projects.length === 0 ? 'No projects yet' : 'No projects match your search'}</p>
                {projects.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4" />
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
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        }`}
                      >
                        <FolderOpen className="h-4 w-4" />
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
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveRename(project)}
                              disabled={!editName.trim()}
                            >
                              <Check className="h-4 w-4" />
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

                      <div className="flex flex-shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleStartRename(project)}
                          aria-label={`Rename ${project.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant={isActive ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleOpenProject(project)}
                          disabled={openingId === project.id}
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
  );
};
