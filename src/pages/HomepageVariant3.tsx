import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Layout, History, Share2, X, User, Target, Grid3X3 } from "lucide-react";
import { Link } from "react-router-dom";
import InteractiveDemo from "@/components/InteractiveDemo";
import { ComponentLibraryPlanner } from "@/components/ComponentLibraryPlanner";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const HomepageVariant3 = () => {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const { user, isAnonymous, loading, signOut } = useAuth();
	const navigate = useNavigate();
	const [visibleSections, setVisibleSections] = useState(new Set());
	const sectionsRef = useRef<{ [key: string]: HTMLElement | null }>({});

	// Scroll animation observer
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const sectionId = entry.target.getAttribute('data-section');
					if (sectionId) {
						setVisibleSections(prev => {
							const newSet = new Set(prev);
							if (entry.isIntersecting) {
								newSet.add(sectionId);
							}
							return newSet;
						});
					}
				});
			},
			{ threshold: 0.1, rootMargin: '-50px' }
		);

		Object.values(sectionsRef.current).forEach(section => {
			if (section) observer.observe(section);
		});

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!loading && (user || isAnonymous)) {
			navigate('/app');
		}
	}, [user, isAnonymous, loading, navigate]);

	return (
		<>
			<style>{`
				@keyframes floatUp {
					0% {
						transform: translateY(60px);
						opacity: 0;
					}
					100% {
						transform: translateY(0);
						opacity: 1;
					}
				}
				
				@keyframes floatGentle {
					0%, 100% {
						transform: translateY(0px) rotate(var(--rotation, 0deg));
					}
					50% {
						transform: translateY(-10px) rotate(var(--rotation, 0deg));
					}
				}
				
				@keyframes bobFloat {
					0%, 100% {
						transform: translateY(0px) rotate(var(--rotation, 0deg));
					}
					50% {
						transform: translateY(-8px) rotate(var(--rotation, 0deg));
					}
				}
				
				@keyframes pulseGlow {
					0%, 100% {
						box-shadow: 0 0 20px rgba(var(--glow-color, 255, 100, 150), 0.3);
					}
					50% {
						box-shadow: 0 0 40px rgba(var(--glow-color, 255, 100, 150), 0.6);
					}
				}
				
				@keyframes hueShift {
					0% {
						filter: hue-rotate(0deg);
					}
					33% {
						filter: hue-rotate(15deg);
					}
					66% {
						filter: hue-rotate(-10deg);
					}
					100% {
						filter: hue-rotate(0deg);
					}
				}
				
				@keyframes textReveal {
					0% {
						transform: translateY(30px);
						opacity: 0;
					}
					100% {
						transform: translateY(0);
						opacity: 1;
					}
				}
				
				.animate-float-up {
					animation: floatUp 0.8s ease-out forwards;
				}
				
				.animate-float-gentle {
					animation: floatGentle 6s ease-in-out infinite;
				}
				
				.animate-bob-float {
					animation: bobFloat 4s ease-in-out infinite;
				}
				
				.animate-pulse-glow {
					animation: pulseGlow 3s ease-in-out infinite;
				}
				
				.animate-hue-shift {
					animation: hueShift 8s ease-in-out infinite;
				}
				
				.animate-text-reveal {
					animation: textReveal 0.6s ease-out forwards;
				}
				
				.animate-text-reveal-delay-1 {
					animation: textReveal 0.6s ease-out 0.1s forwards;
					opacity: 0;
				}
				
				.animate-text-reveal-delay-2 {
					animation: textReveal 0.6s ease-out 0.2s forwards;
					opacity: 0;
				}
				
				.animate-text-reveal-delay-3 {
					animation: textReveal 0.6s ease-out 0.3s forwards;
					opacity: 0;
				}
			`}</style>
			<div className="min-h-dvh bg-black text-white overflow-x-hidden">
			{/* Navigation */}
			<nav className="border-b border-brand-pink/20 bg-black/90 backdrop-blur-xl sticky top-0 z-50">
				<div className=" mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-20 gap-8">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-gradient-to-br from-brand-pink to-brand-blue rounded-2xl flex items-center justify-center transform rotate-12 animate-pulse-glow animate-bob-float" style={{ '--glow-color': '255, 100, 150', '--rotation': '12deg' } as any}>
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
			<section 
				className="relative overflow-hidden bg-black"
				data-section="hero"
				ref={el => sectionsRef.current.hero = el}
			>
				<div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
					<div className={`grid md:grid-cols-2 gap-16 items-center transition-all duration-1000 ${visibleSections.has('hero') ? 'animate-float-up' : 'opacity-0 translate-y-12'}`}>
						{/* Left Column - Typography & CTA */}
						<div className="relative z-10">
							{/* Badge */}
							<div className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-brand-green/20 to-brand-blue/20 backdrop-blur-sm border border-brand-green/30 mb-12 transform -rotate-1">
								<Grid3X3 className="w-6 h-6 text-brand-green mr-3" />
								<span className="text-brand-green font-black text-lg tracking-wide">FOR FIGMA DESIGN TEAMS</span>
							</div>
							
							{/* Main Headline */}
							<div className="space-y-6 mb-16">
								<h1 className="text-[19vw] md:text-[9vw] xl:text-9xl font-display font-black leading-none tracking-tighter">
									<span className={`block text-white ${visibleSections.has('hero') ? 'animate-text-reveal' : 'opacity-0'}`}>DESIGN</span>
									<span className={`block text-transparent bg-clip-text bg-gradient-to-r from-brand-pink via-brand-orange to-brand-yellow animate-hue-shift ${visibleSections.has('hero') ? 'animate-text-reveal-delay-1' : 'opacity-0'}`}>
										SYSTEMS
									</span>
									<span className={`block text-white ${visibleSections.has('hero') ? 'animate-text-reveal-delay-2' : 'opacity-0'}`}>THAT</span>
									<span className={`block text-transparent bg-clip-text bg-gradient-to-r from-brand-green via-brand-blue to-brand-pink transform rotate-1 animate-hue-shift ${visibleSections.has('hero') ? 'animate-text-reveal-delay-3' : 'opacity-0'}`}>
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
									<Button size="lg" className="text-2xl px-12 py-9 bg-gradient-to-r from-brand-pink to-brand-orange hover:from-brand-orange hover:to-brand-pink text-white font-black rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300">
										START PLANNING
										<ArrowRight className="!size-8" />
									</Button>
								</Link>
								<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
									<DialogTrigger asChild>
										<Button variant="outline" size="lg" className="text-2xl px-12 py-8 border-4 border-brand-green text-brand-green bg-transparent hover:bg-brand-green hover:text-black font-black rounded-2xl transition-all duration-300">
											VIEW DEMO
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-none w-screen h-dvh p-0 border-0 bg-background">
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
						<div className="relative animate-bob-float">
							{/* Demo Container */}
							<div className="relative bg-gradient-to-br from-brand-blue/20 to-brand-pink/20 p-4 xl:p-8 rounded-3xl backdrop-blur-sm border border-white/10 transform rotate-1">
								<div className="aspect-[3/4] xl:aspect-[4/3] relative">
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
									<div className="text-3xl font-black text-white">STRATEGIZE</div>
									<div className="text-lg font-bold text-white/80">AT SPEED</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				
				{/* Background Elements */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-pink/10 rounded-full blur-3xl animate-float-gentle" style={{ '--rotation': '0deg', animationDelay: '0s' } as any}></div>
					<div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl animate-float-gentle" style={{ '--rotation': '0deg', animationDelay: '2s' } as any}></div>
					<div className="absolute top-1/2 right-1/3 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl animate-float-gentle" style={{ '--rotation': '0deg', animationDelay: '4s' } as any}></div>
				</div>
			</section>

			{/* Philosophy Section */}
			<section 
				className="py-24 bg-gradient-to-br from-brand-green via-brand-blue to-brand-pink relative animate-hue-shift"
				data-section="philosophy"
				ref={el => sectionsRef.current.philosophy = el}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
					<div className={`max-w-5xl mx-auto transition-all duration-1000 ${visibleSections.has('philosophy') ? 'animate-float-up' : 'opacity-0 translate-y-12'}`}>
						<h2 className="text-[10vw] lg:text-8xl font-display font-black text-white mb-12 leading-tight tracking-tighter">
							<span className={`${visibleSections.has('philosophy') ? 'animate-text-reveal' : 'opacity-0'}`}>WE BELIEVE THAT</span> 
							<span className={`block text-black ${visibleSections.has('philosophy') ? 'animate-text-reveal-delay-1' : 'opacity-0'}`}>COMPONENT PLANNING</span>
							<span className={`block text-white ${visibleSections.has('philosophy') ? 'animate-text-reveal-delay-2' : 'opacity-0'}`}>IS MORE THAN JUST</span>
							<span className={`block text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-brand-orange animate-hue-shift ${visibleSections.has('philosophy') ? 'animate-text-reveal-delay-3' : 'opacity-0'}`}>
								ORGANIZATION
							</span>
						</h2>
						
						<div className={`bg-brand-yellow p-12 rounded-3xl transform -rotate-1 mt-16 transition-all duration-700 ${visibleSections.has('philosophy') ? 'animate-bob-float' : 'scale-95 opacity-60'}`} style={{ '--rotation': '-1deg', animationDelay: '0.5s' } as any}>
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
				<div className="absolute top-16 left-16 w-32 h-32 bg-brand-yellow rounded-full transform rotate-45 animate-bob-float" style={{ '--rotation': '45deg', animationDelay: '1s' } as any}></div>
				<div className="absolute bottom-16 right-16 w-24 h-24 bg-brand-orange rounded-full animate-float-gentle" style={{ '--rotation': '0deg', animationDelay: '2s' } as any}></div>
				<div className="absolute top-1/2 left-8 w-16 h-16 bg-brand-pink rounded-full transform rotate-12 animate-bob-float" style={{ '--rotation': '12deg', animationDelay: '3s' } as any}></div>
			</section>

			{/* What Sets Us Apart Section */}
			{/* <section className="py-24 bg-gradient-to-r from-brand-orange via-brand-pink to-brand-blue relative overflow-hidden">
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
								<span className="text-black">Use tools built with intention.</span>
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
				</div> */}
				
				{/* Decorative Numbers */}
				{/* <div className="absolute top-8 right-8 text-9xl font-black text-white/10 transform rotate-12">
					01
				</div>
			</section> */}

			{/* Features Grid */}
			<section 
				className="py-24 bg-black relative"
				data-section="features"
				ref={el => sectionsRef.current.features = el}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className={`text-center mb-20 transition-all duration-1000 ${visibleSections.has('features') ? 'animate-float-up' : 'opacity-0 translate-y-12'}`}>
						<h2 className="text-5xl lg:text-7xl font-display font-black text-white mb-8 tracking-tight">
							<span className={`${visibleSections.has('features') ? 'animate-text-reveal' : 'opacity-0'}`}>BUILT FOR</span>
							<span className={`block text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-blue animate-hue-shift ${visibleSections.has('features') ? 'animate-text-reveal-delay-1' : 'opacity-0'}`}>
								MODERN TEAMS
							</span>
						</h2>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{/* Feature 1 */}
						<div className={`group relative transform -rotate-2 transition-all duration-700 ${visibleSections.has('features') ? 'animate-float-up' : 'opacity-0 translate-y-12'}`} style={{ animationDelay: '0.2s' }}>
							<div className="bg-gradient-to-br from-brand-pink to-brand-orange rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:rotate-1 animate-hue-shift">
								<div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
									<Layout className="w-12 h-12 text-white" />
								</div>
								<h3 className="text-3xl font-black text-white mb-6 tracking-tight">AUTOMATIC STRUCTURE</h3>
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
						<div className={`group relative transform translate-y-3 transition-all duration-700 ${visibleSections.has('features') ? 'animate-float-up' : 'opacity-0 translate-y-12'}`} style={{ animationDelay: '0.4s' }}>
							<div className="bg-gradient-to-br from-brand-green to-brand-blue rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:-rotate-1 animate-hue-shift">
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
						<div className={`group relative transform rotate-2 transition-all duration-700 ${visibleSections.has('features') ? 'animate-float-up' : 'opacity-0 translate-y-12'}`} style={{ animationDelay: '0.6s' }}>
							<div className="bg-gradient-to-br from-brand-blue to-brand-pink rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:rotate-1 animate-hue-shift">
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
			<section 
				className="py-32 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-pink relative overflow-hidden animate-hue-shift"
				data-section="cta"
				ref={el => sectionsRef.current.cta = el}
			>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
					<div className={`mb-16 transition-all duration-1000 ${visibleSections.has('cta') ? 'animate-float-up' : 'opacity-0 translate-y-12'}`}>
						<h2 className="text-[10vw] lg:text-8xl font-display font-black text-black mb-8 tracking-tight leading-none">
							<span className={`${visibleSections.has('cta') ? 'animate-text-reveal' : 'opacity-0'}`}>JOIN THE</span>
							<span className={`block text-white ${visibleSections.has('cta') ? 'animate-text-reveal-delay-1' : 'opacity-0'}`}>COMPONENT</span>
							<span className={`block text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-green animate-hue-shift ${visibleSections.has('cta') ? 'animate-text-reveal-delay-2' : 'opacity-0'}`}>
								REVOLUTION
							</span>
						</h2>
						
						<div className={`bg-black p-8 rounded-3xl transform rotate-1 inline-block transition-all duration-700 ${visibleSections.has('cta') ? 'animate-bob-float' : 'scale-95 opacity-60'}`} style={{ '--rotation': '1deg', animationDelay: '0.5s' } as any}>
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
					<div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-blue/20 rounded-full blur-3xl transform rotate-45 animate-float-gentle" style={{ '--rotation': '45deg', animationDelay: '1s' } as any}></div>
					<div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-green/20 rounded-full blur-3xl animate-bob-float" style={{ '--rotation': '0deg', animationDelay: '2s' } as any}></div>
					<div className="absolute top-0 right-0 w-96 h-96 bg-black/10 rounded-full transform rotate-12 animate-float-gentle" style={{ '--rotation': '12deg', animationDelay: '3s' } as any}></div>
					<div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full animate-bob-float" style={{ '--rotation': '0deg', animationDelay: '4s' } as any}></div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-brand-pink/20 bg-black/90 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
					<div className="text-center">
						<div className="flex items-center justify-center gap-4 mb-6">
							<div className="w-12 h-12 bg-gradient-to-br from-brand-pink to-brand-blue rounded-2xl flex items-center justify-center transform rotate-12 animate-pulse-glow animate-bob-float" style={{ '--glow-color': '255, 100, 150', '--rotation': '12deg' } as any}>
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
		</>
	);
};

export default HomepageVariant3;