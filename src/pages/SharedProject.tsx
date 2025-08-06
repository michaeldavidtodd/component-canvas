import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ComponentLibraryPlanner } from "@/components/ComponentLibraryPlanner";
import { useProjectPersistence } from '@/hooks/useProjectPersistence';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const SharedProject = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { getPublicProject } = useProjectPersistence();
  const [sharedData, setSharedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedProject = async () => {
      if (!shareToken) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const data = await getPublicProject(shareToken);
        setSharedData(data);
      } catch (error) {
        console.error('Error loading shared project:', error);
        setError('Project not found or no longer shared');
      } finally {
        setLoading(false);
      }
    };

    loadSharedProject();
  }, [shareToken, getPublicProject]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Project Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go to Planner
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header for shared project */}
      <div className="border-b border-border bg-workspace">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Create Your Own
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">
                {sharedData?.project?.name || 'Shared Project'}
              </h1>
              <p className="text-xs text-muted-foreground">
                Read-only view • Shared by project owner
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/')} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Create Your Own Project
          </Button>
        </div>
      </div>
      
      <ComponentLibraryPlanner 
        isSharedView={true}
        sharedProjectData={sharedData}
      />
    </div>
  );
};

export default SharedProject;