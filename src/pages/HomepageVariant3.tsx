import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Layout, History, Share2, X, User, Target, Grid3X3 } from "lucide-react";
import { Link } from "react-router-dom";
import InteractiveDemo from "@/components/InteractiveDemo";
import { ComponentLibraryPlanner } from "@/components/ComponentLibraryPlanner";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const HomepageVariant3 = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, isAnonymous, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (user || isAnonymous)) {
      navigate('/app');
    }
  }, [user, isAnonymous, loading, navigate]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="border-b border-brand-pink/20 bg-black/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-pink to-brand-blue rounded-2xl flex items-center justify-center transform rotate-12">
                <Layout className="w-7 h-7 text-white transform -rotate-12 flex-shrink-0" />
              </div>
              <span className="text-lg md:text-2xl font-black text-white leading-none tracking-tighter inline-block">Component Canvas</span>
            </div>
            <div className="flex items-center gap-6">
              {loading ? (
                <div className="w-20 h-12 bg-brand-pink/20 rounded-xl animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-sm text-white/80">
                    <User className="size-4" />
                    <span>{user.email}</span>
                  </div>
                  <Button variant="ghost" onClick={signOut} className="text-white border-white/20 hover:bg-brand-pink/20">
                    Sign Out
                  </Button>
                  <Link to="/app">
                    <Button className="bg-gradient-to-r from-brand-pink to-brand-orange hover:scale-105 transition-transform text-white font-black px-6 py-3 rounded-xl">
                      Open App
                      <ArrowRight className="size-5" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <Link to="/auth" className="hidden md:block">
                    <Button variant="ghost" className="text-white border-white/20 hover:bg-white/10">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/app">
                    <Button className="bg-gradient-to-r from-brand-pink to-brand-orange hover:scale-105 transition-transform text-white font-black px-6 py-3 rounded-xl">
                      Get Started
                      <ArrowRight className="size-5" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left Column - Typography & CTA */}
            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-brand-green/20 to-brand-blue/20 backdrop-blur-sm border border-brand-green/30 mb-12 transform -rotate-1">
                <Grid3X3 className="w-6 h-6 text-brand-green mr-3" />
                <span className="text-brand-green font-black text-lg tracking-wide">FOR FIGMA DESIGN TEAMS</span>
              </div>
              
              {/* Main Headline */}
              <div className="space-y-6 mb-16">
                <h1 className="text-[19vw] md:text-[9vw] font-display font-black leading-none tracking-tighter">
                  <span className="block text-white">DESIGN</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-pink via-brand-orange to-brand-yellow">
                    SYSTEMS
                  </span>
                  <span className="block text-white">THAT</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-green via-brand-blue to-brand-pink transform rotate-1">
                    SCALE
                  </span>
                </h1>
              </div>

              {/* Subheadline */}
              <div className="bg-gradient-to-r from-brand-yellow to-brand-orange p-8 rounded-3xl transform -rotate-1 mb-12">
                <p className="text-2xl lg:text-3xl font-black text-black leading-tight tracking-tight">
                  VISUALIZE COMPONENT RELATIONSHIPS. 
                  <span className="block">PLAN HIERARCHIES.</span>
                  <span className="block">BUILD FASTER.</span>
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6">
                <Link to="/app">
                  <Button size="lg" className="text-2xl px-12 py-8 bg-gradient-to-r from-brand-pink to-brand-orange hover:from-brand-orange hover:to-brand-pink text-white font-black rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300">
                    START PLANNING
                    <ArrowRight className="ml-4 w-8 h-8" />
                  </Button>
                </Link>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="text-2xl px-12 py-8 border-4 border-brand-green text-brand-green bg-transparent hover:bg-brand-green hover:text-black font-black rounded-2xl transition-all duration-300">
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
            
            {/* Right Column - Interactive Demo */}
            <div className="relative md:-translate-y-1/3">
              {/* Demo Container */}
              <div className="relative bg-gradient-to-br from-brand-blue/20 to-brand-pink/20 p-8 rounded-3xl backdrop-blur-sm border border-white/10 transform rotate-1">
                <div className="aspect-[4/3] relative">
                  <InteractiveDemo />
                </div>
                
                {/* Demo Label */}
                <div className="absolute -top-4 -left-4 bg-brand-yellow text-black px-6 py-3 rounded-2xl font-black text-lg transform -rotate-12 shadow-2xl">
                  ✨ LIVE DEMO
                </div>
              </div>
              
              {/* Floating Stats */}
              <div className="absolute -bottom-8 -right-8 bg-gradient-to-r from-brand-green to-brand-blue p-6 rounded-2xl transform rotate-12 shadow-2xl">
                <div className="text-center">
                  <div className="text-3xl font-black text-white">90%</div>
                  <div className="text-sm font-bold text-white/80">FASTER PLANNING</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-pink/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-gradient-to-br from-brand-green via-brand-blue to-brand-pink relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-[10vw] lg:text-8xl font-display font-black text-white mb-12 leading-tight tracking-tighter">
              WE BELIEVE THAT 
              <span className="block text-black">COMPONENT PLANNING</span>
              <span className="block text-white">IS MORE THAN JUST</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-brand-orange">
                ORGANIZATION
              </span>
            </h2>
            
            <div className="bg-brand-yellow p-12 rounded-3xl transform -rotate-1 mt-16">
              <p className="text-3xl lg:text-4xl text-black font-black leading-tight tracking-tight">
                It's a form of strategic thinking that allows teams to 
                <span className="underline decoration-4 decoration-brand-pink"> build better systems</span> & 
                <span className="underline decoration-4 decoration-brand-blue"> connect with stakeholders</span> 
                who share similar design values and goals.
              </p>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-16 left-16 w-32 h-32 bg-brand-yellow rounded-full transform rotate-45"></div>
        <div className="absolute bottom-16 right-16 w-24 h-24 bg-brand-orange rounded-full"></div>
        <div className="absolute top-1/2 left-8 w-16 h-16 bg-brand-pink rounded-full transform rotate-12"></div>
      </section>

      {/* What Sets Us Apart Section */}
      <section className="py-24 bg-gradient-to-r from-brand-orange via-brand-pink to-brand-blue relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-6xl lg:text-8xl font-display font-black text-white mb-8 leading-none tracking-tighter transform -rotate-1">
                SINCE
                <span className="block text-black">2025</span>
              </div>
            </div>
            <div>
              <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 leading-tight tracking-tight">
                What sets Component Canvas apart is our relentless 
                <span className="text-black"> commitment to quality</span>
              </h2>
              
              <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-8 border border-white/20 transform rotate-1">
                <Target className="w-16 h-16 text-white mb-6" />
                <p className="text-2xl text-white leading-tight font-bold">
                  Component Canvas uses intelligent algorithms, meticulous organization, and 
                  cutting-edge planning techniques to create component structures 
                  that not only work beautifully but also scale effortlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Numbers */}
        <div className="absolute top-8 right-8 text-9xl font-black text-white/10 transform rotate-12">
          01
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-7xl font-display font-black text-white mb-8 tracking-tight">
              BUILT FOR
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-blue">
                MODERN TEAMS
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative">
              <div className="bg-gradient-to-br from-brand-pink to-brand-orange rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:rotate-1">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <Layout className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-black text-white mb-6 tracking-tight">SMART AUTO-LAYOUT</h3>
                <p className="text-white/90 text-lg leading-relaxed font-medium text-balance">
                  Intelligent auto-organization that adapts to your component structure in real-time. 
                  Watch your hierarchy organize itself as you build.
                </p>
                
                {/* Number */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center font-black text-xl">
                  01
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative">
              <div className="bg-gradient-to-br from-brand-green to-brand-blue rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:-rotate-1">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <History className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-black text-white mb-6 tracking-tight">VERSION CONTROL</h3>
                <p className="text-white/90 text-lg leading-relaxed font-medium text-balance">
                  Track every change and evolution of your design system architecture. 
                  Never lose track of your component journey.
                </p>
                
                {/* Number */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center font-black text-xl">
                  02
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative">
              <div className="bg-gradient-to-br from-brand-blue to-brand-pink rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:rotate-1">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <Share2 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-black text-white mb-6 tracking-tight">TEAM COLLABORATION</h3>
                <p className="text-white/90 text-lg leading-relaxed font-medium text-balance">
                  Collaborate seamlessly with stakeholders and align on structure before building. 
                  Share your vision with everyone.
                </p>
                
                {/* Number */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center font-black text-xl">
                  03
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(315, 100%, 72%, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(315, 100%, 72%, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px'
          }}></div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-pink relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-16">
            <h2 className="text-[10vw] lg:text-8xl font-display font-black text-black mb-8 tracking-tight leading-none">
              JOIN THE
              <span className="block text-white">COMPONENT</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-green">
                REVOLUTION
              </span>
            </h2>
            
            <div className="bg-black p-8 rounded-3xl transform rotate-1 inline-block">
              <p className="text-2xl lg:text-3xl text-white font-black leading-tight tracking-tight max-w-3xl">
                PLAN YOUR LIBRARY. ORGANIZE YOUR HIERARCHY. 
                <span className="text-brand-yellow"> REVOLUTIONIZE YOUR DESIGN SYSTEM.</span>
              </p>
            </div>
          </div>
          
          <Link to="/app">
            <Button size="lg" className="text-xl md:text-2xl md:px-16 md:py-10 px-8 py-8 bg-brand-green text-black hover:bg-black hover:text-white font-black rounded-3xl shadow-2xl transform hover:scale-110 transition-all duration-300 border-4 border-black">
              START PLANNING NOW
              <ArrowRight className="!size-10" />
            </Button>
          </Link>
        </div>
        
        {/* Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-blue/20 rounded-full blur-3xl transform rotate-45"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-green/20 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-black/10 rounded-full transform rotate-12"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-pink/20 bg-black/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-pink to-brand-blue rounded-2xl flex items-center justify-center transform rotate-12">
                <Layout className="w-7 h-7 text-white transform -rotate-12" />
              </div>
              <span className="text-3xl font-black text-white tracking-tighter">Component Canvas</span>
            </div>
            <p className="text-lg text-white/60 font-medium">
              Visualize and organize your Figma component relationships with style.
            </p>
            
            {/* Footer Links */}
            <div className="mt-8 flex flex-wrap justify-center gap-8">
              <Badge variant="outline" className="border-brand-green text-brand-green px-4 py-2 text-sm font-bold">
                DESIGN SYSTEMS
              </Badge>
              <Badge variant="outline" className="border-brand-blue text-brand-blue px-4 py-2 text-sm font-bold">
                FIGMA WORKFLOWS
              </Badge>
              <Badge variant="outline" className="border-brand-yellow text-brand-yellow px-4 py-2 text-sm font-bold">
                TEAM COLLABORATION
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomepageVariant3;