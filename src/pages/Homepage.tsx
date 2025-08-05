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
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-pink via-primary to-brand-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-40">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-8">
              <span className="text-white/90 font-medium">For Figma Design System Teams</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white mb-8 leading-none tracking-tight font-display">
              PLAN YOUR
              <span className="block bg-gradient-to-r from-brand-yellow to-brand-green bg-clip-text text-transparent">
                COMPONENT
              </span>
              <span className="block">LIBRARY</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-white/80 mb-12 leading-relaxed max-w-3xl mx-auto font-medium">
              Visualize and organize your Figma component relationships. 
              Plan hierarchies, manage variants, and collaborate on design system architecture.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/app">
                <Button size="lg" className="text-lg px-10 py-6 bg-white text-primary hover:bg-white/90 font-bold rounded-xl shadow-2xl">
                  START PLANNING
                  <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
              </Link>
              <Link to="/share/demo">
                <Button variant="outline" size="lg" className="text-lg px-10 py-6 border-2 border-white/30 text-white hover:bg-white/10 font-bold rounded-xl backdrop-blur-sm">
                  VIEW DEMO
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-yellow/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-green/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-black text-foreground mb-6 tracking-tight font-display">
              BUILT FOR DESIGN
              <span className="block bg-gradient-to-r from-brand-pink to-primary bg-clip-text text-transparent">
                SYSTEM WORKFLOWS
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-medium">
              Everything you need to plan, organize, and communicate your component library structure
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue to-primary p-8 text-center hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <Layout className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white mb-6 tracking-tight font-display">SMART AUTO-LAYOUT</h3>
              <p className="text-white/80 leading-relaxed font-medium">
                Automatically organize your component hierarchy with intelligent layout algorithms. 
                Toggle on to see your structure adapt as you make changes.
              </p>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-green to-brand-yellow p-8 text-center hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <History className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white mb-6 tracking-tight font-display">VERSION HISTORY</h3>
              <p className="text-white/80 leading-relaxed font-medium">
                Track every change to your component structure. Compare versions, 
                revert changes, and maintain a clear evolution of your design system.
              </p>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-pink to-brand-orange p-8 text-center hover:scale-105 transition-all duration-300 shadow-2xl">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <Share2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white mb-6 tracking-tight font-display">TEAM COLLABORATION</h3>
              <p className="text-white/80 leading-relaxed font-medium">
                Share your component plans with stakeholders and team members. 
                Get feedback and align on structure before building in Figma.
              </p>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>
        
        {/* Background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-brand-pink/10 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-brand-blue/10 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full"></div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
          <h2 className="text-4xl lg:text-6xl font-black text-foreground mb-8 tracking-tight font-display leading-tight">
            PERFECT FOR DESIGN
            <span className="block bg-gradient-to-r from-brand-pink to-primary bg-clip-text text-transparent">
              SYSTEM PLANNING
            </span>
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
      <section className="py-32 bg-gradient-to-r from-brand-orange via-brand-pink to-primary relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 tracking-tight leading-none font-display">
            READY TO ORGANIZE
            <span className="block bg-gradient-to-r from-brand-yellow to-white bg-clip-text text-transparent">
              YOUR DESIGN SYSTEM?
            </span>
          </h2>
          <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            Start planning your component library structure today. No account required to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/app">
              <Button size="lg" className="text-xl px-12 py-6 bg-white text-primary hover:bg-white/90 font-black rounded-xl shadow-2xl">
                START PLANNING NOW
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-brand-yellow/20 rounded-full blur-3xl"></div>
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