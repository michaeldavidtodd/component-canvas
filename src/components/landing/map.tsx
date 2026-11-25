import { useEffect, useId, useRef, useState } from 'react';

/* The landing page's diagrams, drawn in the app's own node language: the
   canvas card (kind label in the type colour, icon tile, name, meta row) and
   the structured map's compact chip (icon tile, name, value, grip). All
   content is synthetic demonstration data. */

export type NodeKind = 'main' | 'variant' | 'sub' | 'token' | 'instance';
type Glyph = NodeKind;

export interface MapNodeDef {
	id: string;
	kind: NodeKind;
	kindLabel: string;
	name: string;
	mono?: boolean;
	meta: string;
	tokenValue?: string;
	w: number;
	chipW: number;
}

export const NODE_COLORS: Record<NodeKind, string> = {
	main: '#8D5CFF',
	variant: '#29C2FF',
	sub: '#00E67A',
	token: '#F5B800',
	instance: '#FF955C',
};

export const CARD_H = 92;
export const CHIP_H = 40;

export const SYSTEM_NODES: MapNodeDef[] = [
	{ id: 'btn', kind: 'main', kindLabel: 'Main Component', name: 'Button', meta: 'Primary action', w: 190, chipW: 190 },
	{ id: 'btn-sm', kind: 'variant', kindLabel: 'Variant', name: 'size / sm', meta: 'Compact density', w: 184, chipW: 190 },
	{ id: 'btn-hover', kind: 'variant', kindLabel: 'Variant', name: 'state / hover', meta: 'Hover state', w: 196, chipW: 190 },
	{ id: 'btn-icon', kind: 'sub', kindLabel: 'Sub Component', name: 'Leading icon', meta: 'Icon slot', w: 190, chipW: 190 },
	{ id: 'tok-500', kind: 'token', kindLabel: 'Token Literal', name: 'radius.base', meta: 'corner-radius', tokenValue: '4px', w: 210, chipW: 210 },
	{ id: 'tok-alias', kind: 'token', kindLabel: 'Token Alias', name: 'radius.button', mono: true, meta: 'corner-radius', w: 214, chipW: 180 },
	{ id: 'tok-usage', kind: 'variant', kindLabel: 'Variant', name: 'Button / Default', meta: 'corner-radius', w: 196, chipW: 150 },
	{ id: 'inst-nav', kind: 'instance', kindLabel: 'Instance', name: 'Navbar button', meta: 'Usage · navigation', w: 196, chipW: 190 },
];

/* Icon-tile glyphs, drawn dark on the type-colour tile (as in-app). */
function TileGlyph({ glyph }: { glyph: Glyph }) {
	const p = { stroke: '#0B1220', strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
	switch (glyph) {
		case 'main':
			return (
				<g {...p}>
					<rect x="2" y="2" width="3.6" height="3.6" rx="0.8" />
					<rect x="8.4" y="2" width="3.6" height="3.6" rx="0.8" />
					<rect x="2" y="8.4" width="3.6" height="3.6" rx="0.8" />
					<rect x="8.4" y="8.4" width="3.6" height="3.6" rx="0.8" />
				</g>
			);
		case 'variant':
			return (
				<g {...p}>
					<path d="M7 2.2 12.2 5 7 7.8 1.8 5 7 2.2z" />
					<path d="M2 8.4 7 11.2 12 8.4" />
				</g>
			);
		case 'sub':
			return <rect x="2.4" y="2.4" width="9.2" height="9.2" rx="1.6" {...p} />;
		case 'token':
			return (
				<g {...p}>
					<circle cx="7" cy="7" r="5" />
					<circle cx="7" cy="4.6" r="0.4" fill="#0B1220" />
					<circle cx="4.8" cy="8.4" r="0.4" fill="#0B1220" />
					<circle cx="9.2" cy="8.4" r="0.4" fill="#0B1220" />
				</g>
			);
		case 'instance':
			return (
				<g {...p}>
					<rect x="4.6" y="4.6" width="7.4" height="7.4" rx="1.4" />
					<path d="M9.4 4.6V3.4a1.4 1.4 0 0 0-1.4-1.4H3.4A1.4 1.4 0 0 0 2 3.4V8a1.4 1.4 0 0 0 1.4 1.4h1.2" />
				</g>
			);
	}
}

export function NodeTile({ kind, x = 0, y = 0 }: { kind: NodeKind; x?: number; y?: number }) {
	return (
		<g transform={`translate(${x}, ${y})`}>
			<rect width={20} height={20} rx={5} fill={NODE_COLORS[kind]} />
			<g transform="translate(3, 3)">
				<TileGlyph glyph={kind} />
			</g>
		</g>
	);
}

/* The canvas card, mirroring the in-app node: the meta block with its
   hairline rule belongs to tokens; other kinds carry a bare description. */
export function NodeCard({ node, x, y, w }: { node: MapNodeDef; x: number; y: number; w?: number }) {
	const c = NODE_COLORS[node.kind];
	const W = w ?? node.w;
	return (
		<g transform={`translate(${x}, ${y})`}>
			<rect width={W} height={CARD_H} rx={8} className="lp-ncard" />
			<text x={14} y={23} className="lp-nkind" fill={c}>{node.kindLabel}</text>
			<NodeTile kind={node.kind} x={W - 32} y={11} />
			<text x={14} y={51} className={node.mono ? 'lp-nname lp-mono-name' : 'lp-nname'}>{node.name}</text>
			{node.kind === 'token' && <line x1={14} x2={W - 14} y1={63} y2={63} className="lp-ndiv" />}
			<text x={14} y={80} className="lp-nmeta">{node.meta}</text>
			{node.tokenValue && (
				<text x={W - 14} y={80} textAnchor="end" className="lp-nvalue">{node.tokenValue}</text>
			)}
			<circle cx={W / 2} cy={0} r={5} className="lp-handle" />
			<circle cx={W / 2} cy={CARD_H} r={5} className="lp-handle" />
		</g>
	);
}

/* The structured-map chip, mirroring the in-app grid chip. */
function GridChip({ node, x, y, w }: { node: MapNodeDef; x: number; y: number; w: number }) {
	return (
		<g transform={`translate(${x}, ${y})`}>
			<rect width={w} height={CHIP_H} rx={8} className="lp-ncard" />
			<NodeTile kind={node.kind} x={10} y={10} />
			<text x={38} y={25} className={node.mono ? 'lp-cname lp-mono-name' : 'lp-cname'}>{node.name}</text>
			{node.tokenValue && (
				<text x={w - 26} y={25} textAnchor="end" className="lp-cvalue">{node.tokenValue}</text>
			)}
			<g className="lp-grip" transform={`translate(${w - 15}, 0)`}>
				{[12, 19, 26].map((cy) => (
					<g key={cy}>
						<circle cx={0} cy={cy} r={1.2} />
						<circle cx={5} cy={cy} r={1.2} />
					</g>
				))}
			</g>
		</g>
	);
}

type EdgeKind = 'violet' | 'gold' | 'grey';
interface EdgeDef { d: string; k: EdgeKind }
interface Pose { x: number; y: number; o?: number }

/* Stage geometry, 1250 x 640 units. States: 0 map, 1 structured, 2 trace, 3 share. */
export const POSES: Record<number, Record<string, Pose>> = {
	0: {
		'btn': { x: 430, y: 120 },
		'btn-sm': { x: 720, y: 40 },
		'btn-hover': { x: 720, y: 170 },
		'btn-icon': { x: 720, y: 300 },
		'inst-nav': { x: 120, y: 60 },
		'tok-500': { x: 130, y: 380 },
		'tok-alias': { x: 470, y: 420 },
		'tok-usage': { x: 790, y: 430 },
	},
	1: {
		'btn': { x: 40, y: 70 },
		'btn-sm': { x: 250, y: 70 },
		'btn-hover': { x: 250, y: 122 },
		'btn-icon': { x: 460, y: 122 },
		'inst-nav': { x: 40, y: 230 },
		'tok-500': { x: 670, y: 250 },
		'tok-alias': { x: 900, y: 250 },
		'tok-usage': { x: 1088, y: 250 },
	},
	2: {
		'tok-500': { x: 150, y: 300 },
		'tok-alias': { x: 480, y: 300 },
		'tok-usage': { x: 810, y: 300 },
		'btn': { x: 1000, y: 90 },
		'btn-sm': { x: 420, y: 60, o: 0.3 },
		'btn-hover': { x: 650, y: 60, o: 0.3 },
		'btn-icon': { x: 510, y: 500, o: 0.3 },
		'inst-nav': { x: 140, y: 60, o: 0.3 },
	},
	3: {
		'btn': { x: 430, y: 120 },
		'btn-sm': { x: 720, y: 40 },
		'btn-hover': { x: 720, y: 170 },
		'btn-icon': { x: 720, y: 300 },
		'inst-nav': { x: 120, y: 60 },
		'tok-500': { x: 130, y: 380 },
		'tok-alias': { x: 470, y: 420 },
		'tok-usage': { x: 790, y: 430 },
	},
};

export const EDGES: Record<number, EdgeDef[]> = {
	0: [
		{ d: 'M 525 212 C 610 250 730 0 812 38', k: 'violet' },
		{ d: 'M 525 212 C 630 250 740 100 818 168', k: 'violet' },
		{ d: 'M 525 212 C 620 260 720 280 815 298', k: 'violet' },
		{ d: 'M 218 152 C 300 190 525 60 525 118', k: 'grey' },
		{ d: 'M 235 472 C 235 540 577 350 577 418', k: 'gold' },
		{ d: 'M 577 512 C 577 560 888 370 888 428', k: 'gold' },
		{ d: 'M 525 212 C 525 300 888 350 888 428', k: 'violet' },
	],
	1: [
		{ d: 'M 230 90 L 250 90', k: 'violet' },
		{ d: 'M 230 96 C 240 96 240 142 250 142', k: 'violet' },
		{ d: 'M 440 142 L 460 142', k: 'grey' },
		{ d: 'M 880 270 L 900 270', k: 'gold' },
		{ d: 'M 1080 270 L 1088 270', k: 'gold' },
	],
	2: [
		{ d: 'M 255 392 C 255 440 587 250 587 298', k: 'gold' },
		{ d: 'M 587 392 C 587 440 908 250 908 298', k: 'gold' },
		{ d: 'M 1095 182 C 1095 250 908 220 908 298', k: 'violet' },
	],
	3: [
		{ d: 'M 525 212 C 610 250 730 0 812 38', k: 'violet' },
		{ d: 'M 525 212 C 630 250 740 100 818 168', k: 'violet' },
		{ d: 'M 525 212 C 620 260 720 280 815 298', k: 'violet' },
		{ d: 'M 218 152 C 300 190 525 60 525 118', k: 'grey' },
		{ d: 'M 235 472 C 235 540 577 350 577 418', k: 'gold' },
		{ d: 'M 577 512 C 577 560 888 370 888 428', k: 'gold' },
		{ d: 'M 525 212 C 525 300 888 350 888 428', k: 'violet' },
	],
};

const TRACE_PATHS = EDGES[2];

const COLUMNS = [
	{ x: 40, label: 'Main', count: 1, w: 190 },
	{ x: 250, label: 'Variants', count: 2, w: 190 },
	{ x: 460, label: 'Sub', count: 1, w: 190 },
	{ x: 670, label: 'Literals', count: 1, w: 210 },
	{ x: 900, label: 'Aliases', count: 1, w: 180 },
	{ x: 1088, label: 'Usage', count: 1, w: 150 },
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
					<g className="lp-evo-map">
						{([0, 1, 2, 3] as const).map((s) => (
							<g key={s} className={`lp-ede-g lp-ede-g${s}`} aria-hidden="true">
								{EDGES[s].map((e, i) => (
									<path key={i} pathLength={1} d={e.d} className={`lp-ede lp-ede-${e.k}`} />
								))}
							</g>
						))}
						<g className="lp-cols" aria-hidden="true">
							{COLUMNS.map((c) => (
								<g key={c.x}>
									<text x={c.x} y={31} className="lp-colhead">{c.label}</text>
									<g transform={`translate(${c.x + c.w - 26}, 19)`}>
										<rect width={26} height={16} rx={8} className="lp-colpill" />
										<text x={13} y={11.5} textAnchor="middle" className="lp-colpill-t">{c.count}</text>
									</g>
									<line x1={c.x} y1={46} x2={c.x} y2={600} className="lp-colrule" />
								</g>
							))}
							<line x1={24} x2={1226} y1={46} y2={46} className="lp-colrule lp-colrule-top" />
						</g>
						{SYSTEM_NODES.map((n, ix) => {
							const p = (POSES[state] && POSES[state][n.id]) || POSES[0][n.id];
							return (
								<g key={n.id} className="lp-en"
									style={{ transform: `translate(${p.x}px, ${p.y}px)`, opacity: p.o ?? 1, transitionDelay: `${ix * 35}ms` }}>
									<g className="lp-anat lp-anat-card">
										<NodeCard node={n} x={0} y={0} />
									</g>
									<g className="lp-anat lp-anat-chip">
										<GridChip node={n} x={0} y={0} w={n.chipW} />
									</g>
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
