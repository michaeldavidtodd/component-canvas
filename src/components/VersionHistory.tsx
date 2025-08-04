import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Clock, User, RotateCcw, Maximize2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
                               switch (type) {
                                 case 'main-component': color = 'bg-component-main'; break;
                                 case 'variant': color = 'bg-component-variant'; break;
                                 case 'sub-component': color = 'bg-component-sub'; break;
                                 case 'token': color = 'bg-component-token'; break;
                                 case 'instance': color = 'bg-component-instance'; break;
                               }
                               
                               return (
                                 <span key={type} className={`px-2 py-1 rounded text-xs text-white ${color}`}>
                                   {type.replace('-', ' ')}: {count}
                                 </span>
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
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Preview: {expandedVersion && formatVersionName(expandedVersion)}
              </div>
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
            </DialogTitle>
          </DialogHeader>
          
          {expandedVersion && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
              
              <div className="h-96 bg-muted/30 rounded border relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg 
                    width="100%" 
                    height="100%" 
                    viewBox="0 0 800 600"
                    className="w-full h-full"
                  >
                    {/* Calculate bounds for proper scaling */}
                    {(() => {
                      const validNodes = expandedVersion.nodes.filter(n => n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number');
                      if (validNodes.length === 0) return null;
                      
                      const minX = Math.min(...validNodes.map(n => n.position.x));
                      const maxX = Math.max(...validNodes.map(n => n.position.x));
                      const minY = Math.min(...validNodes.map(n => n.position.y));
                      const maxY = Math.max(...validNodes.map(n => n.position.y));
                      
                      const width = maxX - minX;
                      const height = maxY - minY;
                      const scale = Math.min(750 / Math.max(width, height), 1);
                      
                      return (
                        <>
                          {/* Render edges first */}
                          {expandedVersion.edges.map((edge, idx) => {
                            const sourceNode = validNodes.find(n => n.id === edge.source);
                            const targetNode = validNodes.find(n => n.id === edge.target);
                            
                            if (!sourceNode || !targetNode) return null;
                            
                            const x1 = (sourceNode.position.x - minX) * scale + 25;
                            const y1 = (sourceNode.position.y - minY) * scale + 25;
                            const x2 = (targetNode.position.x - minX) * scale + 25;
                            const y2 = (targetNode.position.y - minY) * scale + 25;
                            
                            return (
                              <line
                                key={idx}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#6b7280"
                                strokeWidth="2"
                                opacity="0.6"
                              />
                            );
                          })}
                          
                          {/* Render nodes */}
                          {validNodes.map((node, idx) => {
                            const x = (node.position.x - minX) * scale + 25;
                            const y = (node.position.y - minY) * scale + 25;
                            const nodeType = node.data?.componentType || 'default';
                            let color = '#6b7280'; // gray
                            
                            switch (nodeType) {
                              case 'main-component': color = 'hsl(258 100% 68%)'; break; // purple
                              case 'variant': color = 'hsl(197 100% 68%)'; break; // blue
                              case 'sub-component': color = 'hsl(152 100% 68%)'; break; // green
                              case 'token': color = 'hsl(45 100% 68%)'; break; // amber
                              case 'instance': color = 'hsl(21 100% 68%)'; break; // orange
                            }
                            
                            return (
                              <g key={idx}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="8"
                                  fill={color}
                                  stroke="#374151"
                                  strokeWidth="2"
                                />
                                <text
                                  x={x}
                                  y={y + 20}
                                  textAnchor="middle"
                                  fontSize="12"
                                  fill="#374151"
                                  className="font-medium"
                                >
                                  {node.data?.label || node.id.slice(0, 8)}
                                </text>
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};