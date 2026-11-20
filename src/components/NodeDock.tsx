import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { Copy, Plus, LayoutGrid, Sparkles, ToggleLeft, ToggleRight, Save, History, Share, Check, ExternalLink, Edit2, User, LogIn, LogOut, FolderOpen, HelpCircle, EyeOff } from "lucide-react";
import { ComponentType } from "@/types/component";
import { COMPONENT_TYPES } from "@/lib/componentTypes";
import type { Project } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useProject } from '@/hooks/project-context';
import { WEB_ORIGIN } from "@/lib/webOrigin";
import { openExternal } from "@/lib/openExternal";


// Approximate rendered node size, used to center a new node on the viewport
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

// Subtle spring: a slight overshoot as the dock grows and settles.
const SPRING_EASE = "ease-spring";

// Padding of the dock card. The open value is triple the resting value; the
// card's bottom offset compensates so the dock row stays put (see below).
const DOCK_PADDING = "p-1.5";
const DOCK_PADDING_OPEN = "p-[18px]";
const DOCK_BOTTOM = 24;
const DOCK_BOTTOM_OPEN = 12;

type DockGroupId = "add" | "layout" | "project" | "account";

interface DockRowProps {
	icon: ReactNode;
	title: string;
	description?: string;
	badge?: string;
	badgeVariant?: "default" | "outline";
	tileClassName?: string;
	onClick?: () => void;
	disabled?: boolean;
}

const DockRow = ({ icon, title, description, badge, badgeVariant = "outline", tileClassName, onClick, disabled }: DockRowProps) => {
	const content = (
		<>
			<span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tileClassName ?? "bg-muted text-foreground"}`}>{icon}</span>
			<span className="flex min-w-0 flex-col">
				<span className="text-sm font-medium text-foreground">{title}</span>
				{description ? <span className="truncate text-xs text-muted-foreground">{description}</span> : null}
			</span>
			{badge ? (
				<Badge variant={badgeVariant} className="ml-auto flex-shrink-0 text-xs">
					{badge}
				</Badge>
			) : null}
		</>
	);

	if (!onClick) {
		return <div className="flex w-full items-center gap-3 rounded-xl p-2">{content}</div>;
	}

	return (
		<button type="button" onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-60">
			{content}
		</button>
	);
};

interface NodeDockProps {
	onAddNode: (type: ComponentType, position: { x: number; y: number }) => void;
	// Layout
	onSmartLayout?: () => void;
	onCleanupLayout?: () => void;
	autoSmartLayout?: boolean;
	onToggleAutoSmartLayout?: () => void;
	onToggleUI?: () => void;
	// Project
	user?: AuthUser | null;
	isAnonymous?: boolean;
	currentProject?: Project | null;
	onSave?: () => void;
	onShowVersions?: () => void;
	onShowProjects?: () => void;
	autoSaveEnabled?: boolean;
	onToggleAutoSave?: () => void;
	// Account
	onSignOut?: () => void;
	onNavigateToAuth?: () => void;
	onResetOnboarding?: () => void;
}

/**
 * Figma-style floating dock at the bottom of the canvas.
 *
 * Actions are grouped into menus (Add, Layout, Project, Account). Hovering or
 * focusing a group expands its menu upward, revealing the options for that
 * group. The dock is the app's primary navigation.
 */
export const NodeDock = ({ onAddNode, onSmartLayout, onCleanupLayout, autoSmartLayout, onToggleAutoSmartLayout, onToggleUI, user, isAnonymous, currentProject, onSave, onShowVersions, onShowProjects, autoSaveEnabled, onToggleAutoSave, onSignOut, onNavigateToAuth, onResetOnboarding }: NodeDockProps) => {
	const [activeGroup, setActiveGroup] = useState<DockGroupId | null>(null);
	// Keep the last opened group mounted so its content stays visible while the
	// container animates closed.
	const [lastGroup, setLastGroup] = useState<DockGroupId>("add");
	const [contentHeight, setContentHeight] = useState(0);
	const contentRef = useRef<HTMLDivElement>(null);

	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const [editingName, setEditingName] = useState(false);
	const [newName, setNewName] = useState("");
	const [isSigningOut, setIsSigningOut] = useState(false);

	const { toggleProjectPublic, updateProject } = useProject();
	const { toast } = useToast();

	const { getViewport } = useReactFlow();
	const width = useStore((s) => s.width);
	const height = useStore((s) => s.height);

	const showProject = !!(user && !isAnonymous && currentProject);
	const panelGroup: DockGroupId = lastGroup === "project" && !showProject ? "add" : lastGroup;

	// Measure the menu's natural height before paint so the container can
	// animate to it in a single motion, including when switching groups. The
	// observer catches later content changes (e.g. the rename input).
	useLayoutEffect(() => {
		const element = contentRef.current;
		if (!element) return;

		const measure = () => {
			const measured = element.offsetHeight;
			setContentHeight((previous) => (previous === measured ? previous : measured));
		};

		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [panelGroup, activeGroup]);

	const showGroup = (group: DockGroupId) => {
		setLastGroup(group);
		setActiveGroup(group);
	};

	// Place new nodes at the center of the visible canvas, since the menu
	// covers the lower part of the canvas when it is open.
	const handleAdd = (type: ComponentType) => {
		const { x, y, zoom } = getViewport();
		onAddNode(type, {
			x: (width / 2 - x) / zoom - NODE_WIDTH / 2,
			y: (height / 2 - y) / zoom - NODE_HEIGHT / 2,
		});
	};

	const handleShare = async () => {
		if (!currentProject) return;

		try {
			const shareToken = await toggleProjectPublic(currentProject.id, true);
			const shareUrl = `${WEB_ORIGIN}/share/${shareToken}`;

			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);

			toast({
				title: "Project shared!",
				description: "Share link copied to clipboard",
			});
		} catch {
			toast({
				title: "Error",
				description: "Failed to create share link",
				variant: "destructive",
			});
		}
	};

	const handleStopSharing = async () => {
		if (!currentProject) return;

		try {
			await toggleProjectPublic(currentProject.id, false);
			setShareDialogOpen(false);

			toast({
				title: "Sharing disabled",
				description: "Project is now private",
			});
		} catch {
			toast({
				title: "Error",
				description: "Failed to disable sharing",
				variant: "destructive",
			});
		}
	};

	const shareUrl = currentProject?.share_token ? `${WEB_ORIGIN}/share/${currentProject.share_token}` : "";

	const handleEditName = () => {
		setNewName(currentProject?.name || "");
		setEditingName(true);
	};

	const handleSaveName = async () => {
		if (!currentProject || !newName.trim()) return;

		try {
			await updateProject(currentProject.id, { name: newName.trim() });
			setEditingName(false);
		} catch {
			toast({
				title: "Error",
				description: "Failed to update project name",
				variant: "destructive",
			});
		}
	};

	const handleSignOut = async () => {
		if (!onSignOut) return;

		setIsSigningOut(true);
		try {
			await onSignOut();
		} catch {
			toast({
				title: "Error",
				description: "Failed to sign out",
				variant: "destructive",
			});
		} finally {
			setIsSigningOut(false);
		}
	};

	const groups: { id: DockGroupId; label: string; icon: ReactNode }[] = [{ id: "add", label: "Add", icon: <Plus className="h-4 w-4" /> }, { id: "layout", label: "Layout", icon: <LayoutGrid className="h-4 w-4" /> }, ...(showProject ? [{ id: "project" as DockGroupId, label: "Project", icon: <FolderOpen className="h-4 w-4" /> }] : []), { id: "account", label: "Account", icon: <User className="h-4 w-4" /> }];

	const renderPanel = (group: DockGroupId) => {
		if (group === "add") {
			return (
				<div className="space-y-0.5">
					{COMPONENT_TYPES.map(({ type, label, description, icon: Icon, bgClass }) => (
						<DockRow key={type} icon={<Icon className="h-4 w-4" />} title={label} description={description} tileClassName={`${bgClass} text-white`} onClick={() => handleAdd(type)} />
					))}
				</div>
			);
		}

		if (group === "layout") {
			return (
				<div className="space-y-0.5">
					<DockRow icon={<Sparkles className="h-4 w-4" />} title="Optimize" description="Arrange nodes into a clean tree layout" badge="Once" onClick={onSmartLayout} />
					<DockRow icon={<LayoutGrid className="h-4 w-4" />} title="Clean up" description="Snap nodes to the grid" badge="Once" onClick={onCleanupLayout} />
					<DockRow icon={autoSmartLayout ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />} title="Auto-optimize" description="Keep the layout tidy as you build" badge={autoSmartLayout ? "On" : "Off"} badgeVariant={autoSmartLayout ? "default" : "outline"} tileClassName={autoSmartLayout ? "bg-primary text-primary-foreground" : undefined} onClick={onToggleAutoSmartLayout} />
					<DockRow icon={<EyeOff className="h-4 w-4" />} title="Hide UI" description="Hide panels and dock for a clean canvas" badge={"⌘\\"} onClick={onToggleUI} />
				</div>
			);
		}

		if (group === "project") {
			if (!currentProject) return null;

			return (
				<div className="space-y-0.5">
					{editingName ? (
						<div className="flex items-center gap-1 p-2">
							<Input
								value={newName}
								onChange={(event) => setNewName(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") handleSaveName();
									if (event.key === "Escape") setEditingName(false);
								}}
								className="h-8 text-xs"
								placeholder="Project name"
								autoFocus
							/>
							<Button onClick={handleSaveName} className="h-8 w-8 p-0" disabled={!newName.trim()}>
								<Check className="h-4 w-4" />
							</Button>
						</div>
					) : (
						<div className="flex items-center gap-3 rounded-xl p-2">
							<span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
								<FolderOpen className="h-4 w-4" />
							</span>
							<span className="flex min-w-0 flex-col">
								<span className="truncate text-sm font-medium text-foreground">{currentProject.name}</span>
								<span className="text-xs text-muted-foreground">Project</span>
							</span>
							<Button variant="ghost" size="sm" onClick={handleEditName} className="ml-auto h-7 w-7 flex-shrink-0 p-0" aria-label="Rename project">
								<Edit2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					)}

					<DockRow icon={<FolderOpen className="h-4 w-4" />} title="All projects" description="Browse and switch projects" onClick={onShowProjects} />
					<DockRow icon={<Save className="h-4 w-4" />} title="Save" description="Save a new version" onClick={onSave} />
					<DockRow icon={<History className="h-4 w-4" />} title="History" description="Browse and restore versions" onClick={onShowVersions} />
					<DockRow icon={<Share className="h-4 w-4" />} title={currentProject.is_public ? "Manage sharing" : "Share"} description={currentProject.is_public ? "Public read-only link is active" : "Create a public read-only link"} onClick={() => setShareDialogOpen(true)} />
					<DockRow icon={autoSaveEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />} title="Auto-save" description="Save changes automatically" badge={autoSaveEnabled ? "On" : "Off"} badgeVariant={autoSaveEnabled ? "default" : "outline"} tileClassName={autoSaveEnabled ? "bg-primary text-primary-foreground" : undefined} onClick={onToggleAutoSave} />

					<Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Share your project with a link</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								{currentProject.is_public ? (
									<>
										<p className="mb-2 text-sm text-muted-foreground">Anyone with this link can view but not edit your project.</p>
										<div className="flex gap-2">
											<Input value={shareUrl} readOnly className="text-xs" />
											<Button
												onClick={() => {
													navigator.clipboard.writeText(shareUrl);
													setCopied(true);
													setTimeout(() => setCopied(false), 2000);
												}}
											>
												{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
											</Button>
											<Button variant="secondary" onClick={() => void openExternal(shareUrl)}>
												<ExternalLink className="h-3 w-3" />
											</Button>
										</div>
										<Button variant="destructive" onClick={handleStopSharing} className="w-full">
											Stop Sharing
										</Button>
									</>
								) : (
									<>
										<p className="text-sm text-muted-foreground">Create a public link to share your project as read-only with others.</p>
										<Button onClick={handleShare} className="w-full gap-2">
											<Share className="h-3 w-3" />
											Create Share Link
										</Button>
									</>
								)}
							</div>
						</DialogContent>
					</Dialog>
				</div>
			);
		}

		if (group === "account") {
			if (isAnonymous) {
				return (
					<div className="space-y-0.5">
						<DockRow icon={<User className="h-4 w-4" />} title="Guest mode" description="Changes aren't saved" />
						<DockRow icon={<LogIn className="h-4 w-4" />} title="Sign in" description="Save and share your projects" tileClassName="bg-primary text-primary-foreground" onClick={onNavigateToAuth} />
					</div>
				);
			}

			if (!user) return null;

			return (
				<div className="space-y-0.5">
					<div className="flex items-center gap-3 rounded-xl p-2">
						<span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<User className="h-4 w-4" />
						</span>
						<span className="flex min-w-0 flex-col">
							<span className="truncate text-sm font-medium text-foreground">{user.email?.split("@")[0] || "User"}</span>
							<span className="truncate text-xs text-muted-foreground">{user.email}</span>
						</span>
					</div>

					<div className="space-y-1 rounded-xl p-2">
						{/*<span className="text-xs font-medium text-muted-foreground">Theme</span>*/}
						<ThemeToggle />
					</div>

					<DockRow icon={<HelpCircle className="h-4 w-4" />} title="Tutorial" description="Replay the onboarding tour" onClick={onResetOnboarding} />
					<DockRow icon={<LogOut className="h-4 w-4" />} title={isSigningOut ? "Signing out…" : "Sign out"} onClick={handleSignOut} disabled={isSigningOut} />
				</div>
			);
		}

		return null;
	};

	// The card's padding grows when open; lowering its bottom edge by the same
	// amount keeps the dock row anchored to the same spot on screen.
	return (
		<div className={`absolute left-1/2 z-20 -translate-x-1/2 transition-[bottom] duration-300 ${SPRING_EASE}`} style={{ bottom: activeGroup ? DOCK_BOTTOM_OPEN : DOCK_BOTTOM }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
			<div
				className={`box-content flex flex-col overflow-hidden rounded-3xl border border-border bg-background/90 shadow-lg backdrop-blur-md transition-[padding] duration-300 ${SPRING_EASE} ${activeGroup ? DOCK_PADDING_OPEN : DOCK_PADDING}`}
				onMouseLeave={() => setActiveGroup(null)}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node)) {
						setActiveGroup(null);
					}
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape") setActiveGroup(null);
				}}
			>
				<div className={`overflow-hidden transition-[height] duration-300 ${SPRING_EASE}`} style={{ height: activeGroup ? contentHeight : 0 }}>
					<div id="node-dock-panel" ref={contentRef} className={`pb-2 transition-[opacity,visibility] duration-300 ${SPRING_EASE} ${activeGroup ? "visible opacity-100" : "invisible opacity-0"}`}>
						{renderPanel(panelGroup)}
					</div>
				</div>

				<div className={`flex items-center justify-around gap-0.5 transition-[padding] duration-300 ${SPRING_EASE} ${activeGroup ? "pt-2" : ""}`}>
					{groups.map((group) => {
						const isActive = activeGroup === group.id;
						return (
							<button key={group.id} type="button" aria-expanded={isActive} aria-controls="node-dock-panel" onMouseEnter={() => showGroup(group.id)} onFocus={() => showGroup(group.id)} onClick={() => (isActive ? setActiveGroup(null) : showGroup(group.id))} className={`flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-full p-2 border border-transparent hover:border-border text-sm font-medium transition-colors lg:px-5 ${isActive ? "bg-secondary border-border" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
								{group.icon}
								<span>{group.label}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
