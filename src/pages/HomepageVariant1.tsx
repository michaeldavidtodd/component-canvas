import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Layout, History, Share2, Users, Zap, GitBranch, X, User, Sparkles, Target, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import InteractiveDemo from "@/components/InteractiveDemo";
import { ComponentLibraryPlanner } from "@/components/ComponentLibraryPlanner";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const HomepageVariant1 = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, isAnonymous, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (user || isAnonymous)) {
      navigate('/app');
    }
  }, [user, isAnonymous, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight">COMPONENT PLANNER</span>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="w-16 h-9 bg-white/10 rounded animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <User className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <Button variant="ghost" onClick={signOut} className="text-white border-white/20 hover:bg-white/10">Sign Out</Button>
                  <Link to="/app">
                    <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold">
                      Open App
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" className="text-white border-white/20 hover:bg-white/10">Sign In</Button>
                  </Link>
                  <Link to="/app">
                    <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold">
                      Get Started
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-48">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-orange-500/20 to-pink-500/20 backdrop-blur-sm border border-orange-500/30 mb-8">
                <Layout className="w-5 h-5 text-orange-400 mr-2" />
                <span className="text-orange-300 font-bold">FOR FIGMA DESIGN SYSTEM TEAMS</span>
              </div>
              
              <h1 className="text-6xl lg:text-8xl font-black text-white mb-8 leading-none tracking-tighter">
                IT'S A 
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
                  COMPONENT
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  REVOLUTION
                </span>
              </h1>
              
              <p className="text-2xl text-white/80 mb-12 leading-relaxed font-medium">
                THAT CELEBRATES STRUCTURE, ORGANIZATION, AND DESIGN SYSTEM CULTURE.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <Link to="/app">
                  <Button size="lg" className="text-xl px-12 py-6 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-black rounded-2xl shadow-2xl transform hover:scale-105 transition-all">
                    START PLANNING
                    <ArrowRight className="ml-3 w-6 h-6" />
                  </Button>
                </Link>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="text-xl px-12 py-6 border-2 border-white/30 text-white bg-white/10 hover:bg-white/20 font-black rounded-2xl backdrop-blur-sm">
                      VIEW DEMO
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-none w-screen h-screen p-0 border-0 bg-background">
                    <div className="relative w-full h-full">
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm hover:bg-background border border-border"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <ComponentLibraryPlanner />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-3xl p-8 backdrop-blur-sm border border-white/10">
                <InteractiveDemo />
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Quality Section */}
      <section className="py-24 bg-gradient-to-r from-orange-500 to-pink-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-6xl lg:text-8xl font-black text-white mb-8 leading-none tracking-tighter">
                SINCE
              </div>
              <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 leading-tight tracking-tight">
                WHAT SETS COMPONENT PLANNER APART IS OUR RELENTLESS COMMITMENT TO DESIGN SYSTEM EXCELLENCE
              </h2>
            </div>
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <Target className="w-12 h-12 text-white mb-6" />
                <p className="text-xl text-white leading-relaxed font-medium">
                  WE USE INTELLIGENT ALGORITHMS, METICULOUS ORGANIZATION, AND CUTTING-EDGE PLANNING TECHNIQUES 
                  TO CREATE COMPONENT STRUCTURES THAT NOT ONLY WORK SEAMLESSLY BUT ALSO SCALE WITH YOUR DESIGN SYSTEM.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-gradient-to-br from-pink-500 to-purple-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl lg:text-7xl font-black text-white mb-12 leading-tight tracking-tight">
            WE BELIEVE THAT COMPONENT PLANNING IS MORE THAN JUST ORGANIZATION
          </h2>
          <p className="text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed font-medium">
            IT'S A FORM OF STRATEGIC THINKING THAT ALLOWS TEAMS TO BUILD BETTER SYSTEMS & CONNECT WITH 
            STAKEHOLDERS WHO SHARE SIMILAR DESIGN VALUES AND GOALS.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-8 text-center">
              <Layout className="w-16 h-16 text-white mx-auto mb-6" />
              <h3 className="text-3xl font-black text-white mb-4 tracking-tight">SMART LAYOUT</h3>
              <p className="text-white/90 text-lg leading-relaxed">
                Intelligent auto-organization that adapts to your component structure in real-time.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-blue-500 rounded-3xl p-8 text-center">
              <History className="w-16 h-16 text-white mx-auto mb-6" />
              <h3 className="text-3xl font-black text-white mb-4 tracking-tight">VERSION CONTROL</h3>
              <p className="text-white/90 text-lg leading-relaxed">
                Track every change and evolution of your design system architecture.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-8 text-center">
              <Share2 className="w-16 h-16 text-white mx-auto mb-6" />
              <h3 className="text-3xl font-black text-white mb-4 tracking-tight">TEAM SYNC</h3>
              <p className="text-white/90 text-lg leading-relaxed">
                Collaborate seamlessly with stakeholders and align on structure before building.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl lg:text-7xl font-black text-white mb-8 tracking-tight leading-none">
            JOIN THE
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-white">
              COMPONENT REVOLUTION
            </span>
          </h2>
          <p className="text-2xl text-white/90 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            PLAN YOUR LIBRARY. ORGANIZE YOUR HIERARCHY. REVOLUTIONIZE YOUR DESIGN SYSTEM.
          </p>
          <Link to="/app">
            <Button size="lg" className="text-2xl px-16 py-8 bg-white text-purple-900 hover:bg-white/90 font-black rounded-2xl shadow-2xl transform hover:scale-105 transition-all">
              START PLANNING NOW
              <ArrowRight className="ml-4 w-8 h-8" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Layout className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">COMPONENT PLANNER</span>
            </div>
            <p className="text-sm text-white/60">
              VISUALIZE AND ORGANIZE YOUR FIGMA COMPONENT RELATIONSHIPS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomepageVariant1;