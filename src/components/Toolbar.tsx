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
  Mail
} from 'lucide-react';

interface ToolbarProps {
  onAddNode: (type: ComponentType) => void;
  user?: any;
  isAnonymous?: boolean;
  onSignOut?: () => void;
  onNavigateToAuth?: () => void;
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

export const Toolbar = ({ onAddNode, user, isAnonymous, onSignOut, onNavigateToAuth }: ToolbarProps) => {
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
                  <span className="text-xs font-medium text-foreground truncate">
                    {user.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground">Signed in</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start" side="right">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {user.email?.split('@')[0] || 'User'}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
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