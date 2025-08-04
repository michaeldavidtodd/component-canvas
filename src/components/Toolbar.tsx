import { ComponentType } from '@/types/component';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  Component, 
  Layers, 
  Palette, 
  Copy, 
  Square,
  Plus,
  User,
  LogOut,
  Settings,
  Mail,
  Save,
  History,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface ToolbarProps {
  onAddNode: (type: ComponentType) => void;
  user?: any;
  isAnonymous?: boolean;
  onSignOut?: () => void;
  onNavigateToAuth?: () => void;
  onSave?: () => void;
  onShowVersions?: () => void;
  currentProject?: any;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: () => void;
}

const nodeTypes: { type: ComponentType; label: string; icon: React.ReactNode; color: string }[] = [
  {
    type: 'main-component',
    label: 'Main Component',
    icon: <Component className="w-4 h-4" />,
    color: 'bg-component-main'
  },
  {
    type: 'variant',
    label: 'Variant',
    icon: <Layers className="w-4 h-4" />,
    color: 'bg-component-variant'
  },
  {
    type: 'sub-component',
    label: 'Sub Component',
    icon: <Square className="w-4 h-4" />,
    color: 'bg-component-sub'
  },
  {
    type: 'token',
    label: 'Design Token',
    icon: <Palette className="w-4 h-4" />,
    color: 'bg-component-token'
  },
  {
    type: 'instance',
    label: 'Instance',
    icon: <Copy className="w-4 h-4" />,
    color: 'bg-component-instance'
  },
];

export const Toolbar = ({ 
  onAddNode, 
  user, 
  isAnonymous, 
  onSignOut, 
  onNavigateToAuth,
  onSave,
  onShowVersions,
  currentProject,
  autoSaveEnabled,
  onToggleAutoSave 
}: ToolbarProps) => {
  return (
    <div className="w-64 bg-workspace border-r border-border p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Component Library Planner
        </h2>
        <p className="text-sm text-muted-foreground">
          Design and visualize your component structure
        </p>
      </div>
      
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground mb-1">Add Components</h3>
        {nodeTypes.map((nodeType) => (
          <Button
            key={nodeType.type}
            variant="ghost"
            className="justify-start gap-3 h-auto p-3 hover:bg-secondary"
            onClick={() => onAddNode(nodeType.type)}
          >
            <div className={`p-1.5 rounded-md text-white ${nodeType.color}`}>
              {nodeType.icon}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{nodeType.label}</span>
            </div>
            <Plus className="w-4 h-4 ml-auto text-muted-foreground" />
          </Button>
        ))}
      </div>
      
      {/* Save functionality - only show for authenticated users */}
      {user && !isAnonymous && currentProject && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-1">Project</h3>
            <p className="text-xs text-muted-foreground truncate" title={currentProject.name}>
              {currentProject.name}
            </p>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="flex-1 gap-2"
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowVersions}
                className="flex-1 gap-2"
              >
                <History className="h-3 w-3" />
                History
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={onToggleAutoSave}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {autoSaveEnabled ? (
                  <ToggleRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
                Auto-save
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-auto pt-4 border-t border-border space-y-3">
        <p className="text-xs text-muted-foreground">
          Click and drag to create connections between components
        </p>
        
        {/* Auth status */}
        {isAnonymous ? (
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col flex-1">
              <span className="text-xs text-muted-foreground">Guest mode</span>
              <span className="text-xs text-muted-foreground">(no saving)</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToAuth}
              className="text-xs"
            >
              Sign In
            </Button>
          </div>
        ) : user ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 h-auto p-2 w-full justify-start hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col flex-1 text-left">
                  <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                    {user.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground">Signed in</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start" side="top">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate max-w-[160px]">
                      {user.email?.split('@')[0] || 'User'}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[140px]">{user.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="p-2 space-y-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
};