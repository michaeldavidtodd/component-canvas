import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Layout, History, Share2, Users, Zap, GitBranch, X, User, Ship, Compass, Anchor } from "lucide-react";
import { Link } from "react-router-dom";
import InteractiveDemo from "@/components/InteractiveDemo";
import { ComponentLibraryPlanner } from "@/components/ComponentLibraryPlanner";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const HomepageVariant2 = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, isAnonymous, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (user || isAnonymous)) {
      navigate('/app');
    }
  }, [user, isAnonymous, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200/50 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Ship className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">COMPONENT PLANNER</span>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="w-16 h-9 bg-gray-200 rounded animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <Button variant="ghost" onClick={signOut} className="text-gray-700 hover:bg-gray-100">Sign Out</Button>
                  <Link to="/app">
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold">
                      Open App
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" className="text-gray-700 hover:bg-gray-100">Sign In</Button>
                  </Link>
                  <Link to="/app">
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold">
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
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-48">
          <div className="text-center">
            <div className="inline-flex items-center px-8 py-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-12">
              <span className="text-white/90 font-bold text-lg">For Figma Design System Teams</span>
            </div>
            
            <h1 className="text-7xl lg:text-9xl font-black text-white mb-16 leading-none tracking-tighter">
              BUILDING THE
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                BEST
              </span>
              <span className="block">COMPONENT LIBRARY</span>
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-20">
              <Link to="/app">
                <Button size="lg" className="text-xl px-12 py-6 bg-white text-purple-900 hover:bg-white/90 font-black rounded-2xl shadow-2xl transform hover:scale-105 transition-all">
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
            
            <div className="relative h-80 max-w-4xl mx-auto">
              <InteractiveDemo />
            </div>
          </div>
        </div>
        
        {/* Ship illustration background */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-64 opacity-20">
          <div className="relative w-full h-full">
            <div className="absolute bottom-0 left-1/4 w-96 h-32 bg-white/20 rounded-t-full"></div>
            <div className="absolute bottom-8 left-1/3 w-64 h-16 bg-white/30 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-lg font-bold text-orange-400 mb-8 tracking-wider uppercase">MAKE COMPONENT PLANNING JUST WORK</h2>
            <p className="text-3xl lg:text-4xl leading-relaxed font-medium">
              If design teams have to struggle with it, we don't ship it. An effortless planning experience takes effort on 
              our part. But when we get it right, Component Planner works like magic. So make sure everything 
              passes the no-stress test: keep it <span className="underline decoration-orange-400">intuitive</span> and <span className="underline decoration-orange-400">friction-free</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-r from-green-400 to-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-6xl lg:text-8xl font-black text-black mb-8 leading-none tracking-tighter">
                ELEVATING
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700">
                  DESIGN
                </span>
                <span className="block">SYSTEMS</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                  TOGETHER
                </span>
              </h2>
            </div>
            <div className="space-y-12">
              <div>
                <div className="text-6xl font-black text-black mb-4">90%</div>
                <p className="text-xl text-black font-semibold">Faster component planning</p>
              </div>
              <div>
                <div className="text-6xl font-black text-black mb-4">75%</div>
                <p className="text-xl text-black font-semibold">Better team alignment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Relationships Section */}
      <section className="py-24 bg-gradient-to-r from-yellow-400 to-orange-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-lg font-bold text-blue-700 mb-4">VISUALIZE</div>
          <h2 className="text-6xl lg:text-8xl font-black text-black mb-12 leading-tight tracking-tighter">
            CULTIVATING
            <span className="block">COMPONENT RELATIONSHIPS</span>
          </h2>
          <p className="text-2xl text-black/80 max-w-4xl mx-auto leading-relaxed font-medium">
            Building strong connections between components, hierarchies, and design patterns to create 
            organized systems that scale beautifully with your product.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-7xl font-black text-gray-900 mb-8 tracking-tight leading-tight">
              WE BUILD TO
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                PLAN BETTER
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gradient-to-br from-purple-100 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all">
              <Compass className="w-12 h-12 text-purple-600 mb-6" />
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">SMART AUTO-LAYOUT</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                Intelligent pathways through your component structure that adapt automatically as you build.
              </p>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-green-100 to-yellow-100 border-0 shadow-lg hover:shadow-xl transition-all">
              <Anchor className="w-12 h-12 text-green-600 mb-6" />
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">VERSION HISTORY</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                Rock-solid foundations that track every change and evolution of your component architecture.
              </p>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-orange-100 to-red-100 border-0 shadow-lg hover:shadow-xl transition-all">
              <Ship className="w-12 h-12 text-orange-600 mb-6" />
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">TEAM COLLABORATION</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                Seamless voyage from planning to implementation with stakeholder alignment every step.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl lg:text-7xl font-black text-white mb-8 tracking-tight leading-none">
            READY TO BUILD
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
              YOUR COMPONENT LIBRARY?
            </span>
          </h2>
          <p className="text-2xl text-white/90 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            Chart your course through component architecture. No experience required to start planning.
          </p>
          <Link to="/app">
            <Button size="lg" className="text-2xl px-16 py-8 bg-white text-purple-900 hover:bg-white/90 font-black rounded-2xl shadow-2xl transform hover:scale-105 transition-all">
              START PLANNING
              <ArrowRight className="ml-4 w-8 h-8" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Ship className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight">COMPONENT PLANNER</span>
            </div>
            <p className="text-sm text-gray-600">
              Visualize and organize your Figma component relationships with intuitive planning tools.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomepageVariant2;