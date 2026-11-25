import { Link, useNavigate } from 'react-router-dom';
import { NodeCard, SYSTEM_NODES, type MapNodeDef } from './map';

/* First viewport: the map assembles itself around the headline, drawn in the
   app's own node language. Synthetic demonstration system. */

const byId = Object.fromEntries(SYSTEM_NODES.map((n) => [n.id, n])) as Record<string, MapNodeDef>;

interface HPlacement { id: string; x: number; y: number; delay: number; float: number }

const PLACEMENTS: HPlacement[] = [
	{ id: 'btn', x: 800, y: 300, delay: 0.05, float: 7 },
	{ id: 'btn-sm', x: 1060, y: 170, delay: 0.1, float: 8 },
	{ id: 'btn-hover', x: 1060, y: 320, delay: 0.16, float: 6.4 },
	{ id: 'btn-icon', x: 1060, y: 470, delay: 0.22, float: 7.6 },
	{ id: 'inst-nav', x: 520, y: 90, delay: 0.28, float: 6.8 },
	{ id: 'tok-500', x: 600, y: 660, delay: 0.34, float: 7.2 },
	{ id: 'tok-alias', x: 870, y: 700, delay: 0.4, float: 6.2 },
	{ id: 'tok-usage', x: 1140, y: 630, delay: 0.46, float: 7.8 },
];

const INPUT_NODE: MapNodeDef = { id: 'inp', kind: 'main', kindLabel: 'Main Component', name: 'Input', meta: 'Form field', w: 160, chipW: 160 };

const HERO_EDGES: { d: string; k: 'violet' | 'gold' | 'grey'; d0: number; hot?: boolean }[] = [
	{ d: 'M 895 392 C 895 470 1152 60 1152 168', k: 'violet', d0: 0.1 },
	{ d: 'M 895 392 C 895 450 1158 220 1158 318', k: 'violet', d0: 0.16 },
	{ d: 'M 895 392 C 895 460 1155 380 1155 468', k: 'violet', d0: 0.22 },
	{ d: 'M 618 182 C 618 260 895 220 895 298', k: 'grey', d0: 0.28 },
	{ d: 'M 705 752 C 705 800 977 640 977 698', k: 'gold', d0: 0.34 },
	{ d: 'M 977 792 C 977 850 1238 540 1238 628', k: 'gold', d0: 0.4, hot: true },
	{ d: 'M 895 392 C 895 480 1238 540 1238 628', k: 'violet', d0: 0.46 },
];

export function HeroMap() {
	return (
		<svg className="lp-hero-map" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
			<defs>
				<pattern id="lp-dots" width="36" height="36" patternUnits="userSpaceOnUse">
					<circle cx="1.5" cy="1.5" r="1.5" fill="#131a2e" />
				</pattern>
			</defs>
			<rect width="1440" height="900" fill="url(#lp-dots)" />
			{HERO_EDGES.map((e, i) => (
				<path key={i} pathLength={1} d={e.d} className={`lp-edge lp-ede-${e.k}`} fill="none"
					style={{ animationDelay: `${e.d0}s` }} />
			))}
			<path pathLength={1} d="M 1084 742 C 1110 730 1120 680 1140 668" className="lp-pulse" fill="none" />
			{PLACEMENTS.map((p) => (
				<g key={p.id} className="lp-hnode"
					style={{ animationDelay: `${p.delay}s, 1.2s`, animationDuration: `0.7s, ${p.float}s` } as React.CSSProperties}>
					<NodeCard node={byId[p.id]} x={p.x} y={p.y} />
				</g>
			))}
			<g className="lp-hnode" style={{ animationDelay: '0.52s, 1.2s', animationDuration: '0.7s, 7.4s' } as React.CSSProperties}>
				<NodeCard node={INPUT_NODE} x={1180} y={60} />
			</g>
		</svg>
	);
}

/* Portrait arrangement for narrow viewports: same system, re-laid. */
function MobileHeroMap() {
	const placements: { id: string; x: number; y: number; w: number; delay: number }[] = [
		{ id: 'btn', x: 16, y: 16, w: 184, delay: 0.05 },
		{ id: 'btn-sm', x: 208, y: 16, w: 184, delay: 0.12 },
		{ id: 'btn-hover', x: 16, y: 136, w: 184, delay: 0.18 },
		{ id: 'btn-icon', x: 208, y: 136, w: 184, delay: 0.24 },
		{ id: 'tok-500', x: 16, y: 256, w: 184, delay: 0.3 },
		{ id: 'tok-alias', x: 208, y: 256, w: 184, delay: 0.36 },
	];
	const edges = [
		{ d: 'M 200 62 L 208 62', k: 'violet' as const, d0: 0.1 },
		{ d: 'M 106 108 L 108 136', k: 'violet' as const, d0: 0.16 },
		{ d: 'M 200 178 L 208 178', k: 'grey' as const, d0: 0.22 },
		{ d: 'M 200 298 L 208 298', k: 'gold' as const, d0: 0.28 },
		{ d: 'M 300 256 C 300 200 190 140 110 110', k: 'gold' as const, d0: 0.34 },
	];
	return (
		<svg className="lp-hero-map-mobile" viewBox="0 0 400 352" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
			{edges.map((e, i) => (
				<path key={i} pathLength={1} d={e.d} className={`lp-edge lp-ede-${e.k}`} fill="none"
					style={{ animationDelay: `${e.d0}s` }} />
			))}
			{placements.map((p) => (
				<g key={p.id} className="lp-hnode" style={{ animationDelay: `${p.delay}s, 1.2s` }}>
					<NodeCard node={byId[p.id]} x={p.x} y={p.y} w={p.w} />
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
				<p className="lp-sub">Scaffold a new design system from scratch or audit existing tokens with CSS import. Get help and fix issues with the AI advisor.</p>
			</div>
			<MobileHeroMap />
			<div className="lp-hero-note lp-mono" aria-hidden="true">The map is a demonstration — synthetic data</div>
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
