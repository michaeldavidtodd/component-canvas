import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleLayoutTest from "@/components/SimpleLayoutTest";
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, isAnonymous, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && !isAnonymous) {
      navigate('/auth');
    }
  }, [user, isAnonymous, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SimpleLayoutTest />
    </div>
  );
};

export default Index;