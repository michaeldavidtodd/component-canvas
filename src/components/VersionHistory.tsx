import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Clock, User, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  name?: string;
  nodes: any[];
  edges: any[];
  viewport?: any;
  is_auto_save: boolean;
  created_at: string;
}

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: ProjectVersion[];
  onLoadVersion: (versionId: string) => Promise<ProjectVersion | null>;
  onDeleteVersion?: (versionId: string) => void;
  onVersionLoaded?: (version: ProjectVersion) => void;
}

export const VersionHistory = ({
  open,
  onOpenChange,
  versions,
  onLoadVersion,
  onDeleteVersion,
  onVersionLoaded
}: VersionHistoryProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleLoadVersion = async (versionId: string) => {
    setLoading(versionId);
    try {
      const version = await onLoadVersion(versionId);
      if (version && onVersionLoaded) {
        onVersionLoaded(version);
        onOpenChange(false);
      }
    } finally {
      setLoading(null);
    }
  };

  const formatVersionName = (version: ProjectVersion) => {
    if (version.name) return version.name;
    if (version.is_auto_save) return `Auto-save #${version.version_number}`;
    return `Version #${version.version_number}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No versions found</p>
                <p className="text-sm">Save your first version to see it here</p>
              </div>
            ) : (
              versions.map((version, index) => (
                 <div
                   key={version.id}
                   className="border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors overflow-hidden"
                 >
                   <div className="flex items-center justify-between p-4">
                     <div className="flex items-center gap-3 flex-1">
                       <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                         {version.is_auto_save ? (
                           <Clock className="h-4 w-4" />
                         ) : (
                           <User className="h-4 w-4" />
                         )}
                       </div>
                       
                       <div className="flex flex-col flex-1">
                         <div className="flex items-center gap-2">
                           <span className="font-medium text-sm">
                             {formatVersionName(version)}
                           </span>
                           {index === 0 && (
                             <Badge variant="secondary" className="text-xs">
                               Latest
                             </Badge>
                           )}
                           {version.is_auto_save && (
                             <Badge variant="outline" className="text-xs">
                               Auto-saved
                             </Badge>
                           )}
                         </div>
                         
                         <div className="flex items-center gap-2 text-xs text-muted-foreground">
                           <span>
                             {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                           </span>
                           <span>•</span>
                           <span>
                             {version.nodes.length} nodes, {version.edges.length} connections
                           </span>
                         </div>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleLoadVersion(version.id)}
                         disabled={loading === version.id}
                         className="gap-2"
                       >
                         <RotateCcw className="h-3 w-3" />
                         {loading === version.id ? 'Loading...' : 'Restore'}
                       </Button>
                       
                       {onDeleteVersion && !version.is_auto_save && index !== 0 && (
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => onDeleteVersion(version.id)}
                           className="text-destructive hover:text-destructive"
                         >
                           Delete
                         </Button>
                       )}
                     </div>
                   </div>
                   
                   {/* Version Preview */}
                   {version.nodes && version.nodes.length > 0 && (
                     <div className="h-24 bg-muted/30 border-t border-border">
                       <ReactFlow
                         nodes={version.nodes}
                         edges={version.edges}
                         fitView
                         attributionPosition="bottom-right"
                         nodesDraggable={false}
                         nodesConnectable={false}
                         elementsSelectable={false}
                         zoomOnScroll={false}
                         zoomOnPinch={false}
                         panOnDrag={false}
                         style={{ 
                           backgroundColor: 'transparent',
                           pointerEvents: 'none'
                         }}
                       >
                         <Background 
                           variant={BackgroundVariant.Dots} 
                           gap={12} 
                           size={1}
                           style={{ opacity: 0.3 }}
                         />
                       </ReactFlow>
                     </div>
                   )}
                 </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};