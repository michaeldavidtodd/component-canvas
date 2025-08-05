import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, ArrowRight, ArrowLeft, Sparkles, Share, History, Layout, Zap, ToggleLeft, ToggleRight } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const onboardingSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Component Library Planner!',
    description: 'Build and visualize your Figma component library architecture with ease.',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
            <Layout className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <p className="text-center text-muted-foreground">
          Create interactive diagrams to plan your Figma component relationships, track changes, and share your designs with your team. This tool helps you organize your design system.
        </p>
      </div>
    ),
    highlight: null
  },
  {
    id: 'smart-layout',
    title: 'Smart Auto Layout',
    description: 'Automatically organize your components as you build.',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm">Updates layout structure as you make changes</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm">Maintains clean, readable layouts automatically</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm">Focuses view on newly added components</span>
          </div>
        </div>
        <Badge variant="secondary" className="mx-auto">Toggle "Auto Smart Layout" in the toolbar!</Badge>
      </div>
    ),
    highlight: 'smart-layout'
  },
  {
    id: 'version-history',
    title: 'Version History & Auto-Save',
    description: 'Never lose your work and track every change.',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <History className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Automatic saves when changes are made</span>
          </div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Browse and restore previous versions</span>
          </div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-sm">See exactly what changed when</span>
          </div>
        </div>
        <Badge variant="secondary" className="mx-auto">Click the history icon to explore!</Badge>
      </div>
    ),
    highlight: 'version-history'
  },
  {
    id: 'sharing',
    title: 'Share Your Designs',
    description: 'Collaborate with your team effortlessly.',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
            <Share className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Share className="w-4 h-4 text-purple-600" />
            <span className="text-sm">Generate public links instantly</span>
          </div>
          <div className="flex items-center gap-2">
            <Share className="w-4 h-4 text-purple-600" />
            <span className="text-sm">View-only access for stakeholders</span>
          </div>
          <div className="flex items-center gap-2">
            <Share className="w-4 h-4 text-purple-600" />
            <span className="text-sm">Perfect for design reviews</span>
          </div>
        </div>
        <Badge variant="secondary" className="mx-auto">Look for the share button in the toolbar!</Badge>
      </div>
    ),
    highlight: 'sharing'
  },
  {
    id: 'get-started',
    title: 'Ready to Build!',
    description: 'Start creating your component library architecture.',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
            <ArrowRight className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <p className="text-center text-muted-foreground">
          Add your first component by clicking any of the component buttons in the toolbar.
        </p>
        <div className="flex items-center justify-center">
          <Badge className="bg-gradient-to-r from-primary to-primary/80">
            Happy building! 🚀
          </Badge>
        </div>
      </div>
    ),
    highlight: null
  }
];

export const OnboardingFlow = ({ onComplete, onSkip }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleSkip}
    >
      <div 
        className={`transition-all duration-300 transform ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="w-[480px] shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index <= currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} of {onboardingSteps.length}
              </span>
            </div>
            <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {currentStepData.content}
            
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Previous
              </Button>
              
              <div className="flex gap-2">
                {!isLastStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip tour
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="flex items-center gap-1"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};