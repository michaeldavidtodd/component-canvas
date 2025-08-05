import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Clock, User, RotateCcw, Maximize2, X, Component, Layers, Square, Palette, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
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
  nodeTypes?: any;
}

export const VersionHistory = ({
  open,
  onOpenChange,
  versions,
  onLoadVersion,
  onDeleteVersion,
  onVersionLoaded,
  nodeTypes
}: VersionHistoryProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<ProjectVersion | null>(null);

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No versions found</p>
                  <p className="text-sm">Save your first version to see it here</p>
                </div>
              ) : (
                versions.slice(0, 10).map((version, index) => (
                   <div
                     key={version.id}
                     className="border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors p-4"
                   >
                     <div className="flex items-center justify-between">
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
                           onClick={() => setExpandedVersion(version)}
                           className="gap-2"
                         >
                           <Maximize2 className="h-3 w-3" />
                           Preview
                         </Button>
                         
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
                     
                   {/* Simple preview */}
                   {version.nodes && version.nodes.length > 0 && (
                     <div className="mt-3 p-3 bg-muted/30 rounded border">
                       <div className="text-xs text-muted-foreground">
                         <div className="flex items-center gap-4 mb-2">
                           <span className="font-medium">Components:</span>
                           <span>{version.nodes.length} total</span>
                         </div>
                         <div className="flex flex-wrap gap-1">
                           {(() => {
                             const componentCounts = version.nodes.reduce((acc, node) => {
                               const type = node.data?.componentType || 'unknown';
                               acc[type] = (acc[type] || 0) + 1;
                               return acc;
                             }, {} as Record<string, number>);
                             
                             return Object.entries(componentCounts).map(([type, count]: [string, number]) => {
                               let color = 'bg-muted';
                               let icon = null;
                               switch (type) {
                                 case 'main-component': 
                                   color = 'bg-component-main'; 
                                   icon = <Component className="w-3 h-3" />;
                                   break;
                                 case 'variant': 
                                   color = 'bg-component-variant'; 
                                   icon = <Layers className="w-3 h-3" />;
                                   break;
                                 case 'sub-component': 
                                   color = 'bg-component-sub'; 
                                   icon = <Square className="w-3 h-3" />;
                                   break;
                                 case 'token': 
                                   color = 'bg-component-token'; 
                                   icon = <Palette className="w-3 h-3" />;
                                   break;
                                 case 'instance': 
                                   color = 'bg-component-instance'; 
                                   icon = <Copy className="w-3 h-3" />;
                                   break;
                               }
                               
                               return (
                                 <div key={type} className="flex items-center gap-2 px-2 py-1 rounded text-xs">
                                   <div className={`p-1 rounded text-white ${color}`}>
                                     {icon}
                                   </div>
                                   <span className="text-foreground">
                                     {type.replace('-', ' ')}: {count}
                                   </span>
                                 </div>
                               );
                             });
                           })()}
                         </div>
                       </div>
                     </div>
                   )}
                   </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Expanded Preview Modal */}
      <Dialog open={!!expandedVersion} onOpenChange={() => setExpandedVersion(null)}>
        <DialogPortal>
          <DialogOverlay />
                    <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-50 w-screen h-screen max-w-none translate-x-[-50%] translate-y-[-50%] bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          >
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Preview: {expandedVersion && formatVersionName(expandedVersion)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => expandedVersion && handleLoadVersion(expandedVersion.id)}
                    disabled={loading === expandedVersion?.id}
                    className="gap-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {loading === expandedVersion?.id ? 'Loading...' : 'Restore This Version'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedVersion(null)}
                    className="gap-2"
                  >
                    <X className="h-3 w-3" />
                    Close
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
          
          {expandedVersion && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 text-sm text-muted-foreground p-6 pb-4">
                <span>Created: {formatDistanceToNow(new Date(expandedVersion.created_at), { addSuffix: true })}</span>
                <span>•</span>
                <span>{expandedVersion.nodes.length} nodes</span>
                <span>•</span>
                <span>{expandedVersion.edges.length} connections</span>
                {expandedVersion.is_auto_save && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">Auto-saved</Badge>
                  </>
                )}
              </div>
              
              <div className="flex-1 bg-muted/30 border-t relative overflow-hidden">
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={expandedVersion.nodes}
                    edges={expandedVersion.edges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
                    style={{ width: '100%', height: '100%' }}
                    className="bg-canvas"
                  />
                </ReactFlowProvider>
              </div>
            </div>
          )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
};