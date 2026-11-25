import { Link, useNavigate } from 'react-router-dom';

/* First viewport: the map assembles itself around the headline.
   Synthetic demonstration system (a fictional Button component). */

interface HNode {
	x: number; y: number; w: number;
	kind: string; name: string; color: string;
	delay: number; float: number;
}

const NODES: HNode[] = [
	{ x: 760, y: 380, w: 150, kind: 'MAIN', name: 'Button', color: '#8D5CFF', delay: 0.05, float: 7 },
	{ x: 990, y: 250, w: 168, kind: 'VARIANT', name: 'size / sm', color: '#29C2FF', delay: 0.1, float: 8 },
	{ x: 990, y: 400, w: 184, kind: 'VARIANT', name: 'state / hover', color: '#29C2FF', delay: 0.16, float: 6.4 },
	{ x: 990, y: 550, w: 168, kind: 'SUB', name: 'Leading icon', color: '#00E67A', delay: 0.22, float: 7.6 },
	{ x: 470, y: 130, w: 176, kind: 'INSTANCE', name: 'Navbar button', color: '#FF955C', delay: 0.28, float: 6.8 },
	{ x: 520, y: 700, w: 196, kind: 'TOKEN · LITERAL', name: 'color.brand.500', color: '#F5B800', delay: 0.34, float: 7.2 },
	{ x: 790, y: 730, w: 200, kind: 'ALIAS', name: 'button.background', color: '#F5B800', delay: 0.4, float: 6.2 },
	{ x: 1090, y: 680, w: 160, kind: 'USAGE', name: 'Button / bg', color: '#F5B800', delay: 0.45, float: 7.8 },
	{ x: 1230, y: 80, w: 140, kind: 'MAIN', name: 'Input', color: '#8D5CFF', delay: 0.5, float: 7.4 },
];

const EDGE_LIST = [
	{ d: 'M 910 396 C 950 396 950 278 990 278', d0: 0.1 },
	{ d: 'M 910 408 L 990 428', d0: 0.16, hot: true },
	{ d: 'M 910 420 C 955 420 950 578 990 578', d0: 0.22 },
	{ d: 'M 760 392 C 680 370 660 180 646 158', d0: 0.28 },
	{ d: 'M 716 728 C 745 728 755 758 790 758', d0: 0.34, gold: true },
	{ d: 'M 990 758 C 1040 758 1050 708 1090 708', d0: 0.4, gold: true },
	{ d: 'M 1170 680 C 1130 600 960 470 912 430', d0: 0.46, gold: true },
];

/* Portrait arrangement for narrow viewports: same system, re-laid. */
function MobileHeroMap() {
	const nodes = [
		{ x: 130, y: 110, w: 150, kind: 'MAIN', name: 'Button', color: '#8D5CFF', delay: 0.05 },
		{ x: 216, y: 40, w: 168, kind: 'VARIANT', name: 'size / sm', color: '#29C2FF', delay: 0.12 },
		{ x: 216, y: 190, w: 170, kind: 'VARIANT', name: 'state / hover', color: '#29C2FF', delay: 0.18 },
		{ x: 24, y: 190, w: 140, kind: 'SUB', name: 'Leading icon', color: '#00E67A', delay: 0.24 },
		{ x: 24, y: 20, w: 176, kind: 'INSTANCE', name: 'Navbar button', color: '#FF955C', delay: 0.3 },
		{ x: 24, y: 270, w: 168, kind: 'TOKEN · LITERAL', name: 'color.brand.500', color: '#F5B800', delay: 0.36 },
		{ x: 216, y: 270, w: 160, kind: 'ALIAS', name: 'button.background', color: '#F5B800', delay: 0.42 },
	];
	const edges: { d: string; d0: number; gold?: boolean }[] = [
		{ d: 'M 280 124 C 302 104 240 68 216 68', d0: 0.1 },
		{ d: 'M 280 152 C 306 172 244 218 216 218', d0: 0.16 },
		{ d: 'M 130 166 C 96 176 92 190 94 190', d0: 0.22 },
		{ d: 'M 190 110 C 150 96 120 84 112 76', d0: 0.28 },
		{ d: 'M 192 298 L 216 298', d0: 0.34, gold: true },
		{ d: 'M 296 270 C 296 236 256 190 232 168', d0: 0.4, gold: true },
	];
	return (
		<svg className="lp-hero-map-mobile" viewBox="0 0 400 340" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
			<defs>
				<marker id="lp-amh" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M0 0L8 4L0 8z" fill="#46557c" />
				</marker>
			</defs>
			{edges.map((e, i) => (
				<path key={i} pathLength={1} d={e.d} className="lp-edge" fill="none"
					stroke={e.gold ? '#a8852a' : '#46557c'} strokeWidth="1.5"
					style={{ animationDelay: `${e.d0}s` }} />
			))}
			{nodes.map((n) => (
				<g key={n.name} className="lp-hnode" style={{ animationDelay: `${n.delay}s, 1.2s` }}>
					<rect x={n.x} y={n.y} width={n.w} height={56} rx={10} fill="#0D1326" stroke="#26304E" />
					<circle cx={n.x + 17} cy={n.y + 28} r={5} fill={n.color} />
					<text x={n.x + 32} y={n.y + 24} fontFamily="DM Mono, ui-monospace, monospace"
						fontSize="10" letterSpacing="1.5" fill={n.color}>{n.kind}</text>
					<text x={n.x + 32} y={n.y + 41} fontFamily="Inter, system-ui, sans-serif"
						fontWeight="600" fontSize="14" fill="#EDF1F8">{n.name}</text>
				</g>
			))}
		</svg>
	);
}

export function HeroMap() {
	return (
		<svg className="lp-hero-map" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
			<defs>
				<pattern id="lp-dots" width="36" height="36" patternUnits="userSpaceOnUse">
					<circle cx="1.5" cy="1.5" r="1.5" fill="#131a2e" />
				</pattern>
				<marker id="lp-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M0 0L8 4L0 8z" fill="#46557c" />
				</marker>
			</defs>
			<rect width="1440" height="900" fill="url(#lp-dots)" />
			{EDGE_LIST.map((e, i) => (
				<path key={i} pathLength={1} d={e.d} className="lp-edge" fill="none"
					stroke={e.gold ? '#a8852a' : '#46557c'} strokeWidth="1.5" markerEnd={e.gold ? undefined : 'url(#lp-ah)'}
					style={{ animationDelay: `${e.d0}s` }} />
			))}
			<path pathLength={1} d="M 910 408 L 990 428" className="lp-pulse" fill="none"
				stroke="#29C2FF" strokeWidth="2" strokeLinecap="round" />
			{NODES.map((n) => (
				<g key={n.name} className="lp-hnode"
					style={{ animationDelay: `${n.delay}s, 1.2s`, animationDuration: `0.7s, ${n.float}s` } as React.CSSProperties}>
					<rect x={n.x} y={n.y} width={n.w} height={56} rx={10} fill="#0D1326" stroke="#26304E" />
					<circle cx={n.x + 17} cy={n.y + 28} r={5} fill={n.color} />
					<text x={n.x + 32} y={n.y + 24} fontFamily="DM Mono, ui-monospace, monospace"
						fontSize="10" letterSpacing="1.5" fill={n.color}>{n.kind}</text>
					<text x={n.x + 32} y={n.y + 41} fontFamily="Inter, system-ui, sans-serif"
						fontWeight="600" fontSize="14" fill="#EDF1F8">{n.name}</text>
				</g>
			))}
		</svg>
	);
}

export function Hero({ signedIn, onGuest }: { signedIn: boolean; onGuest: () => void }) {
	const navigate = useNavigate();
	return (
		<section className="lp-hero" aria-label="Component Canvas — introduction">
			<HeroMap />
			<header className="lp-top">
				<span className="lp-brand">
					<span className="lp-mark" aria-hidden="true"><i /><i /><i /><i /></span>
					<span className="lp-mono" style={{ color: 'var(--lp-ink)' }}>Component Canvas</span>
				</span>
				{signedIn
					? <Link className="lp-mono" to="/app">Open app →</Link>
					: <Link className="lp-mono" to="/auth">Sign in</Link>}
			</header>
			<div className="lp-hero-copy">
				<h1 className="lp-h1">Your whole component system, on one map.</h1>
				<p className="lp-sub">
					Plan hierarchies, variants, and token chains as one living diagram — modeled on
					Figma's structure, ready to replicate in Figma or code.
				</p>
			</div>
			<div className="lp-hero-note lp-mono" aria-hidden="true">The map is a demonstration — synthetic data</div>
			<MobileHeroMap />
			<div className="lp-dock">
				<span className="lp-hint">Free · open sign-up</span>
				{signedIn
					? <button type="button" className="lp-btn lp-btn-fill" onClick={() => navigate('/app')}>Open app</button>
					: <button type="button" className="lp-btn lp-btn-fill" onClick={() => navigate('/auth?mode=signup')}>Start free</button>}
				{!signedIn && (
					<button type="button" className="lp-btn lp-btn-ghost" onClick={onGuest}>
						Continue as guest
					</button>
				)}
				<span className="lp-dock-sep" aria-hidden="true" />
				<span className="lp-hint">macOS — coming soon</span>
			</div>
		</section>
	);
}
