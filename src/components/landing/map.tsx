import { useEffect, useId, useRef, useState } from 'react';

/* Shared vocabulary for the landing page's diagrams. All content is
   synthetic demonstration data for a fictional "Button" system. */

export type NodeKind = 'main' | 'variant' | 'sub' | 'token' | 'instance';

export interface MapNodeDef {
	id: string;
	kind: NodeKind;
	kindLabel: string;
	name: string;
	w: number;
}

export const NODE_COLORS: Record<NodeKind, string> = {
	main: '#8D5CFF',
	variant: '#29C2FF',
	sub: '#00E67A',
	token: '#F5B800',
	instance: '#FF955C',
};

export const SYSTEM_NODES: MapNodeDef[] = [
	{ id: 'btn', kind: 'main', kindLabel: 'MAIN', name: 'Button', w: 150 },
	{ id: 'btn-sm', kind: 'variant', kindLabel: 'VARIANT', name: 'size / sm', w: 168 },
	{ id: 'btn-hover', kind: 'variant', kindLabel: 'VARIANT', name: 'state / hover', w: 184 },
	{ id: 'btn-icon', kind: 'sub', kindLabel: 'SUB', name: 'Leading icon', w: 168 },
	{ id: 'tok-500', kind: 'token', kindLabel: 'TOKEN · LITERAL', name: 'color.brand.500', w: 196 },
	{ id: 'tok-alias', kind: 'token', kindLabel: 'ALIAS', name: 'button.background', w: 200 },
	{ id: 'tok-usage', kind: 'token', kindLabel: 'USAGE', name: 'Button / bg', w: 160 },
	{ id: 'inst-nav', kind: 'instance', kindLabel: 'INSTANCE', name: 'Navbar button', w: 176 },
];

interface Pose { x: number; y: number; o?: number }

/* Stage geometry, 1250 x 640 units. States: 0 map, 1 structured, 2 trace, 3 share. */
export const POSES: Record<number, Record<string, Pose>> = {
	0: {
		'btn': { x: 440, y: 280 },
		'btn-sm': { x: 700, y: 150 },
		'btn-hover': { x: 700, y: 300 },
		'btn-icon': { x: 700, y: 450 },
		'inst-nav': { x: 130, y: 120 },
		'tok-500': { x: 120, y: 500 },
		'tok-alias': { x: 400, y: 540 },
		'tok-usage': { x: 690, y: 540 },
	},
	1: {
		'btn': { x: 40, y: 90 },
		'btn-sm': { x: 230, y: 90 },
		'btn-hover': { x: 230, y: 200 },
		'btn-icon': { x: 450, y: 200 },
		'inst-nav': { x: 40, y: 320 },
		'tok-500': { x: 660, y: 470 },
		'tok-alias': { x: 860, y: 470 },
		'tok-usage': { x: 1070, y: 470 },
	},
	2: {
		'tok-500': { x: 150, y: 320 },
		'tok-alias': { x: 460, y: 320 },
		'tok-usage': { x: 770, y: 320 },
		'btn': { x: 990, y: 200 },
		'btn-sm': { x: 430, y: 80, o: 0.3 },
		'btn-hover': { x: 620, y: 80, o: 0.3 },
		'btn-icon': { x: 520, y: 520, o: 0.3 },
		'inst-nav': { x: 150, y: 80, o: 0.3 },
	},
	3: {
		'btn': { x: 440, y: 280 },
		'btn-sm': { x: 700, y: 150 },
		'btn-hover': { x: 700, y: 300 },
		'btn-icon': { x: 700, y: 450 },
		'inst-nav': { x: 130, y: 120 },
		'tok-500': { x: 120, y: 500 },
		'tok-alias': { x: 400, y: 540 },
		'tok-usage': { x: 690, y: 540 },
	},
};

interface EdgeDef { d: string; gold?: boolean }

export const EDGES: Record<number, EdgeDef[]> = {
	0: [
		{ d: 'M 590 296 C 640 296 650 178 700 178' },
		{ d: 'M 590 308 C 640 308 650 328 700 328' },
		{ d: 'M 590 320 C 650 320 650 478 700 478' },
		{ d: 'M 440 290 C 350 272 330 158 306 148' },
		{ d: 'M 316 528 C 350 528 366 568 400 568' },
		{ d: 'M 596 568 L 690 568', gold: true },
		{ d: 'M 770 540 C 720 470 620 395 545 338', gold: true },
	],
	1: [
		{ d: 'M 190 118 L 230 118' },
		{ d: 'M 190 122 C 215 122 205 228 230 228' },
		{ d: 'M 190 126 C 330 126 320 228 450 228' },
		{ d: 'M 856 498 L 860 498', gold: true },
		{ d: 'M 1060 498 L 1070 498', gold: true },
	],
	2: [
		{ d: 'M 346 348 L 460 348', gold: true },
		{ d: 'M 660 348 L 770 348', gold: true },
		{ d: 'M 930 348 C 985 348 950 262 990 240', gold: true },
	],
	3: [
		{ d: 'M 590 296 C 640 296 650 178 700 178' },
		{ d: 'M 590 308 C 640 308 650 328 700 328' },
		{ d: 'M 590 320 C 650 320 650 478 700 478' },
		{ d: 'M 440 290 C 350 272 330 158 306 148' },
		{ d: 'M 316 528 C 350 528 366 568 400 568' },
		{ d: 'M 596 568 L 690 568', gold: true },
		{ d: 'M 770 540 C 720 470 620 395 545 338', gold: true },
	],
};

/* Pulse overlays for the trace state (same geometry as state 2). */
const TRACE_PATHS = EDGES[2];

const COLUMNS = [
	{ x: 40, label: 'MAIN COMPONENT', w: 150 },
	{ x: 230, label: 'VARIANT', w: 184 },
	{ x: 450, label: 'SUB-COMPONENT', w: 168 },
	{ x: 660, label: 'LITERAL', w: 196 },
	{ x: 860, label: 'ALIAS', w: 200 },
	{ x: 1070, label: 'USAGE', w: 160 },
];

export const STATE_LABELS = [
	'Canvas · synthetic data',
	'Structured map · synthetic data',
	'Token trace · synthetic data',
	'Share link · synthetic data',
];

const STATE_ARIA = [
	'Free-form canvas map of a synthetic component system',
	'The same system rearranged as a structured table: columns are hierarchy levels',
	'The same system highlighting a token chain from literal to alias to usage',
	'The same system dimmed beside a read-only share link',
];

export function EvolutionMap({ state, className }: {
	state: number;
	className?: string;
}) {
	const uid = useId().replace(/:/g, '');
	const [copied, setCopied] = useState(false);
	return (
		<div className={`lp-stage-wrap${className ? ` ${className}` : ''}`}>
			<div className="lp-stage-label lp-mono">{STATE_LABELS[state]}</div>
			<div className="lp-stage" data-state={state}>
			<svg className="lp-evo" viewBox="0 0 1250 640" role="img"
				aria-label={STATE_ARIA[state] ?? STATE_ARIA[0]}>
				<defs>
					<marker id={`ah-${uid}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
						<path d="M0 0L8 4L0 8z" fill="#55648a" />
					</marker>
				</defs>
				<g className="lp-evo-map">
					{([0, 1, 2, 3] as const).map((s) => (
						<g key={s} className={`lp-ede-g lp-ede-g${s}`} aria-hidden="true">
							{EDGES[s].map((e, i) => (
								<path key={i} pathLength={1} d={e.d} className={`lp-ede${e.gold ? ' lp-ede-gold' : ''}`}
									markerEnd={e.gold ? undefined : `url(#ah-${uid})`} />
							))}
						</g>
					))}
					<g className="lp-cols" aria-hidden="true">
						{COLUMNS.map((c) => (
							<g key={c.x}>
								<text x={c.x} y={46} fontSize="13">{c.label}</text>
								<line x1={c.x} y1={60} x2={c.x} y2={580} />
							</g>
						))}
					</g>
					{SYSTEM_NODES.map((n, ix) => {
						const p = (POSES[state] && POSES[state][n.id]) || POSES[0][n.id];
						return (
							<g key={n.id} className="lp-en"
								style={{ transform: `translate(${p.x}px, ${p.y}px)`, opacity: p.o ?? 1, transitionDelay: `${ix * 35}ms` }}>
								<rect width={n.w} height={56} rx={10} className="lp-en-rect" />
								<circle cx={18} cy={28} r={6} fill={NODE_COLORS[n.kind]} />
								<text x={36} y={21} className="lp-en-kind" fill={NODE_COLORS[n.kind]}>{n.kindLabel}</text>
								<text x={36} y={44} className="lp-en-name">{n.name}</text>
							</g>
						);
					})}
					<g className="lp-trace" aria-hidden="true">
						{TRACE_PATHS.map((e, i) => (
							<path key={i} pathLength={1} d={e.d} style={{ animationDelay: `${i * 0.5}s` }} />
						))}
					</g>
				</g>
			</svg>
			<div className="lp-share" aria-hidden={state !== 3}>
				<div className="lp-share-kind lp-mono">Shared link</div>
				<div className="lp-share-link">
					<span>…/#/share/7f3k9w8d</span>
					<button
						type="button"
						className="lp-copy"
						aria-label="Copy share link"
						tabIndex={state === 3 ? 0 : -1}
						onClick={() => {
							navigator.clipboard?.writeText('…/#/share/7f3k9w8d').catch(() => {});
							setCopied(true);
							window.setTimeout(() => setCopied(false), 1400);
						}}
					>
						{copied ? (
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#66ffff" strokeWidth="1.8" aria-hidden="true">
								<path d="M3 8.5l3.2 3L13 4.5" />
							</svg>
						) : (
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
								<rect x="5.5" y="5.5" width="8" height="8" rx="2" />
								<path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" />
							</svg>
						)}
					</button>
				</div>
				<div className="lp-share-meta">Read-only, always current with the map. Synthetic example.</div>
			</div>
			</div>
		</div>
	);
}

/* One-shot in-view trigger for diagram entrances. */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.3) {
	const ref = useRef<T>(null);
	const [on, setOn] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					setOn(true);
					io.disconnect();
				}
			},
			{ threshold },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [threshold]);
	return { ref, on };
}
