import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Layout, History, Share2, Users, Zap, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";

const Homepage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Layout className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">Component Planner</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/app">
                <Button>
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 text-sm">
              For Figma Design System Teams
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Plan Your Component
              <span className="text-primary block">Library Structure</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Visualize and organize your Figma component relationships. 
              Plan hierarchies, manage variants, and collaborate on design system architecture.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/app">
                <Button size="lg" className="text-base px-8 py-6">
                  Start Planning
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/share/demo">
                <Button variant="outline" size="lg" className="text-base px-8 py-6">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-component-variant/5 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Built for Design System Workflows
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to plan, organize, and communicate your component library structure
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 text-center border-border/50 hover:border-primary/20 transition-colors">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Layout className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Smart Auto-Layout</h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatically organize your component hierarchy with intelligent layout algorithms. 
                Toggle on to see your structure adapt as you make changes.
              </p>
            </Card>

            <Card className="p-8 text-center border-border/50 hover:border-primary/20 transition-colors">
              <div className="w-16 h-16 bg-component-variant/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <History className="w-8 h-8 text-component-variant" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Version History</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track every change to your component structure. Compare versions, 
                revert changes, and maintain a clear evolution of your design system.
              </p>
            </Card>

            <Card className="p-8 text-center border-border/50 hover:border-primary/20 transition-colors">
              <div className="w-16 h-16 bg-component-sub/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Share2 className="w-8 h-8 text-component-sub" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Team Collaboration</h3>
              <p className="text-muted-foreground leading-relaxed">
                Share your component plans with stakeholders and team members. 
                Get feedback and align on structure before building in Figma.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Perfect for Design System Planning
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Team Alignment</h3>
                    <p className="text-muted-foreground">
                      Get everyone on the same page about component structure before diving into Figma implementation.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-component-variant/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <GitBranch className="w-4 h-4 text-component-variant" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Hierarchy Planning</h3>
                    <p className="text-muted-foreground">
                      Visualize component relationships, variants, and dependencies in an intuitive node-based interface.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-component-sub/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap className="w-4 h-4 text-component-sub" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Faster Iteration</h3>
                    <p className="text-muted-foreground">
                      Experiment with different structures quickly without the overhead of building in Figma first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-canvas border border-border rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute inset-4 border-2 border-dashed border-border/30 rounded-xl"></div>
                <div className="absolute top-12 left-12 w-24 h-16 bg-primary/20 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">Button</span>
                </div>
                <div className="absolute top-12 right-12 w-20 h-12 bg-component-variant/20 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-component-variant">Primary</span>
                </div>
                <div className="absolute bottom-12 left-12 w-20 h-12 bg-component-sub/20 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-component-sub">Ghost</span>
                </div>
                <div className="absolute bottom-12 right-12 w-20 h-12 bg-component-token/20 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-component-token">Icon</span>
                </div>
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path
                    d="M 96 48 Q 120 48 144 48"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 96 64 Q 96 120 96 180"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 96 64 Q 200 100 200 180"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Ready to organize your design system?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Start planning your component library structure today. No account required to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/app">
              <Button size="lg" className="text-base px-8 py-6">
                Start Planning Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Layout className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">Component Planner</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for design system teams who value structure and collaboration.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;