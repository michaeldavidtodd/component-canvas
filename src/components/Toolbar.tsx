import { ComponentType } from '@/types/component';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useProjectPersistence } from '@/hooks/useProjectPersistence';
import { Badge } from '@/components/ui/badge';
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
  ToggleRight,
  Sparkles,
  Layout,
  Share,
  Check,
  ExternalLink,
  Edit2,
  HelpCircle,
  LayoutGrid,
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
  onSmartLayout?: () => void;
  onCleanupLayout?: () => void;
  autoSmartLayout?: boolean;
  onToggleAutoSmartLayout?: () => void;
  onResetOnboarding?: () => void;
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

const layoutOptions = [
  {
    icon: <Sparkles className="w-4 h-4" />,
    title: 'Optimize',
    description: 'Applies an optimized layout. All nodes will be automatically placed for a clean structured tree-shaped layout.',
    badge: 'Once'
  },
  {
    icon: <LayoutGrid className="w-4 h-4" />,
    title: 'Clean up',
    description: 'Applies slight adjustments to node positions to align them to the grid.',
    badge: 'Once'
  },
  {
    icon: <ToggleRight className="w-4 h-4" />,
    title: 'Auto-Optimize Layout',
    description: 'Applies layout optimizations continuously as changes are made.',
    badge: 'Continuous'
  }
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
  onToggleAutoSave,
  onSmartLayout,
  onCleanupLayout,
  autoSmartLayout,
  onToggleAutoSmartLayout,
  onResetOnboarding
}: ToolbarProps) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const { toggleProjectPublic, updateProject } = useProjectPersistence();
  const { toast } = useToast();

  const handleShare = async () => {
    if (!currentProject) return;
    
    try {
      const shareToken = await toggleProjectPublic(currentProject.id, true);
      const shareUrl = `${window.location.origin}/share/${shareToken}`;
      
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Project shared!",
        description: "Share link copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create share link",
        variant: "destructive"
      });
    }
  };

  const handleStopSharing = async () => {
    if (!currentProject) return;
    
    try {
      await toggleProjectPublic(currentProject.id, false);
      setShareDialogOpen(false);
      
      toast({
        title: "Sharing disabled",
        description: "Project is now private"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable sharing",
        variant: "destructive"
      });
    }
  };

  const shareUrl = currentProject?.share_token 
    ? `${window.location.origin}/share/${currentProject.share_token}`
    : '';

  const handleEditName = () => {
    setNewName(currentProject?.name || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!currentProject || !newName.trim()) return;
    
    try {
      await updateProject(currentProject.id, { name: newName.trim() });
      setEditingName(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project name",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNewName('');
  };

  return (
    <div className="w-fit m-4 bg-background border border-border p-6 flex flex-col gap-8 overflow-y-auto rounded-xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2 leading-tight">
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
            variant="secondary"
            className={`gap-3 h-auto`}
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
      
      {/* Layout Controls */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-2">
        <h3 className="col-span-full text-sm font-medium text-foreground mb-1 inline-flex items-center justify-between gap-1">
          Layout 
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs gap-1 cursor-help ">
                  Guidance
                  <HelpCircle className="size-3" />
                </Badge>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-fit max-w-sm rounded-xl" align="start" side="right" sideOffset={10}>
              <div className="space-y-3">
                <h4 className="font-bold">Layout Options</h4>
                <div className="space-y-4 text-sm">
                  {layoutOptions.map((option, index) => (
                    <div key={index} className="flex flex-col items-start gap-2 bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium inline-flex items-center gap-2">
                          {option.icon} {option.title}
                        </span>
                        <Badge variant="outline" className="text-xs">{option.badge}</Badge>
                      </div>
                      <span className="text-muted-foreground text-balance">{option.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </h3>
        <Button
          variant="outline"
          onClick={onSmartLayout}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Optimize
        </Button>
        <Button
          variant="outline"
          onClick={onCleanupLayout}
          className="gap-2"
        >
          <LayoutGrid className="w-4 h-4" />
          Clean Up
        </Button>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onToggleAutoSmartLayout}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {autoSmartLayout ? (
              <ToggleRight className="h-4 w-4 text-green-600" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            Auto-Optimize Layout
          </button>
        </div>
      </div>
      
      {/* Save functionality - only show for authenticated users */}
      {user && !isAnonymous && currentProject && (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-1">Project</h3>
            
            {editingName ? (
              <div className="flex gap-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="text-xs h-7"
                  placeholder="Project name"
                  autoFocus
                />
                <Button
                  onClick={handleSaveName}
                  className="h-7 w-7 p-0"
                  disabled={!newName.trim()}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <p className="text-xs text-muted-foreground truncate flex-1" title={currentProject.name}>
                  {currentProject.name}
                </p>
                <Button
                  variant="ghost"
                  onClick={handleEditName}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onSave}
                className="flex-1 gap-2"
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={onShowVersions}
                className="flex-1 gap-2"
              >
                <History className="h-3 w-3" />
                History
              </Button>
            </div>

            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Share className="h-3 w-3" />
                  {currentProject?.is_public ? 'Manage Sharing' : 'Share Project'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {currentProject?.is_public ? (
                    <>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Share link:</p>
                        <div className="flex gap-2">
                          <Input
                            value={shareUrl}
                            readOnly
                            className="text-xs"
                          />
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(shareUrl);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => window.open(shareUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Anyone with this link can view your project (read-only).
                      </p>
                      <Button
                        variant="destructive"
                        onClick={handleStopSharing}
                        className="w-full"
                      >
                        Stop Sharing
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Create a public link to share your project as read-only with others.
                      </p>
                      <Button
                        onClick={handleShare}
                        className="w-full gap-2"
                      >
                        <Share className="h-3 w-3" />
                        Create Share Link
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
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
        {/* Help section */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetOnboarding}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            Show Tutorial
          </Button>
        </div>
        
        {/* <p className="text-xs text-muted-foreground">
          Click and drag to create connections between components
        </p> */}
        
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
                  {/* <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                    {user.email?.split('@')[0] || 'User'}
                  </span> */}
                  <span className="text-base font-medium text-foreground truncate max-w-[120px]">
                    User Settings
                  </span>
                  <span className="text-xs text-muted-foreground">Signed in</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 rounded-xl" align="start" side="top">
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