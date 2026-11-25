import { useInViewOnce } from './map';

/* Why map first: four outcomes, each with a small live diagram fragment. */

function GlyphSystem({ on }: { on: boolean }) {
	return (
		<svg className="lp-glyph" viewBox="0 0 230 140" data-on={on} aria-hidden="true">
			<path className="g-edge" pathLength={1} d="M 62 70 C 90 70 92 38 118 38" style={{ animationDelay: '0.3s' }} />
			<path className="g-edge" pathLength={1} d="M 62 70 L 118 70" style={{ animationDelay: '0.4s' }} />
			<path className="g-edge" pathLength={1} d="M 62 70 C 90 70 92 102 118 102" style={{ animationDelay: '0.5s' }} />
			<path className="g-edge" pathLength={1} d="M 170 102 L 196 102" style={{ animationDelay: '0.6s' }} />
			<g className="g-node" style={{ animationDelay: '0s' }}>
				<rect x="16" y="54" width="46" height="32" rx="7" fill="#0D1326" stroke="#26304E" />
				<circle cx="28" cy="70" r="4" fill="#8D5CFF" />
			</g>
			<g className="g-node" style={{ animationDelay: '0.15s' }}>
				<rect x="118" y="22" width="52" height="32" rx="7" fill="#0D1326" stroke="#26304E" />
				<circle cx="130" cy="38" r="4" fill="#29C2FF" />
			</g>
			<g className="g-node" style={{ animationDelay: '0.25s' }}>
				<rect x="118" y="54" width="52" height="32" rx="7" fill="#0D1326" stroke="#26304E" />
				<circle cx="130" cy="70" r="4" fill="#29C2FF" />
			</g>
			<g className="g-node" style={{ animationDelay: '0.35s' }}>
				<rect x="118" y="86" width="52" height="32" rx="7" fill="#0D1326" stroke="#26304E" />
				<circle cx="130" cy="102" r="4" fill="#00E67A" />
			</g>
			<g className="g-node" style={{ animationDelay: '0.45s' }}>
				<rect x="196" y="86" width="30" height="32" rx="7" fill="#0D1326" stroke="#26304E" />
				<circle cx="206" cy="102" r="4" fill="#F5B800" />
			</g>
		</svg>
	);
}

function GlyphDebt({ on }: { on: boolean }) {
	return (
		<svg className="lp-glyph" viewBox="0 0 230 140" data-on={on} aria-hidden="true">
			<path className="g-edge" pathLength={1} d="M 62 70 L 92 70" />
			<path d="M 100 70 L 128 70" fill="none" stroke="#FF7A7A" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.7" />
			<g className="g-node">
				<rect x="16" y="54" width="46" height="32" rx="7" fill="#0D1326" stroke="#26304E" />
				<circle cx="28" cy="70" r="4" fill="#8D5CFF" />
			</g>
			<g className="g-node" style={{ animationDelay: '0.2s' }}>
				<rect x="128" y="54" width="52" height="32" rx="7" fill="none" stroke="#FF7A7A" strokeDasharray="5 5" opacity="0.8" />
				<circle cx="140" cy="70" r="4" fill="#FF955C" opacity="0.6" />
			</g>
			<circle className="g-warn" cx="96" cy="70" r="4" fill="none" stroke="#FF7A7A" strokeWidth="1.5" />
			<circle className="g-warn" cx="96" cy="70" r="1.6" fill="#FF7A7A" style={{ animationDelay: '1s' }} />
		</svg>
	);
}

function GlyphStructure({ on }: { on: boolean }) {
	return (
		<svg className="lp-glyph" viewBox="0 0 230 140" data-on={on} aria-hidden="true">
			<g className="g-node">
				<rect x="14" y="52" width="54" height="36" rx="8" fill="#0D1326" stroke="#26304E" />
				<circle cx="26" cy="70" r="4" fill="#8D5CFF" />
				<rect x="34" y="63" width="26" height="4" rx="2" fill="#3A4666" />
				<rect x="34" y="72" width="18" height="4" rx="2" fill="#2A3554" />
			</g>
			<path className="g-edge" pathLength={1} d="M 74 70 L 104 70" style={{ animationDelay: '0.3s' }} />
			<path d="M 104 65 L 112 70 L 104 75 Z" fill="#3A4666" />
			<g className="g-node" style={{ animationDelay: '0.45s' }}>
				<rect x="118" y="20" width="98" height="100" rx="10" fill="none" stroke="#26304E" strokeWidth="1.5" />
				<rect x="118" y="20" width="98" height="18" rx="10" fill="#0D1326" stroke="#26304E" />
			</g>
			<g className="g-node" style={{ animationDelay: '0.6s' }}>
				<rect x="128" y="48" width="78" height="16" rx="5" fill="#0D1326" stroke="#26304E" />
				<circle cx="137" cy="56" r="3" fill="#29C2FF" />
			</g>
			<g className="g-node" style={{ animationDelay: '0.72s' }}>
				<rect x="128" y="70" width="78" height="16" rx="5" fill="#0D1326" stroke="#26304E" />
				<circle cx="137" cy="78" r="3" fill="#29C2FF" />
			</g>
			<g className="g-node" style={{ animationDelay: '0.84s' }}>
				<rect x="128" y="92" width="78" height="16" rx="5" fill="#0D1326" stroke="#26304E" />
				<circle cx="137" cy="100" r="3" fill="#F5B800" />
			</g>
		</svg>
	);
}

function GlyphAdvisor({ on }: { on: boolean }) {
	return (
		<svg className="lp-glyph" viewBox="0 0 230 140" data-on={on} aria-hidden="true">
			<g className="g-node">
				<rect x="60" y="46" width="110" height="48" rx="9" fill="#0D1326" stroke="#26304E" />
				<circle cx="76" cy="70" r="4" fill="#8D5CFF" />
				<rect x="88" y="60" width="64" height="4" rx="2" fill="#3A4666" />
				<rect x="88" y="70" width="46" height="4" rx="2" fill="#2A3554" />
				<rect x="88" y="80" width="54" height="4" rx="2" fill="#2A3554" />
			</g>
			<rect className="g-scan" x="64" y="46" width="3" height="48" rx="1.5" fill="#66FFFF" />
			<g className="g-spark" transform="translate(186, 34)">
				<path d="M0 -11 C 1.2 -3.5 3.5 -1.2 11 0 C 3.5 1.2 1.2 3.5 0 11 C -1.2 3.5 -3.5 1.2 -11 0 C -3.5 -1.2 -1.2 -3.5 0 -11 Z" fill="#66FFFF" />
			</g>
		</svg>
	);
}

const ROWS = [
	{
		h: 'See the whole system at once.',
		p: 'Pages of frames and docs collapse into one map a reviewer reads in a single glance — hierarchy, variants, tokens, and where they land.',
		Glyph: GlyphSystem,
	},
	{
		h: 'Catch structural debt early.',
		p: 'An orphan variant or a dead-end alias is a visible gap on the map — found in planning, not after a quarter of building on top of it.',
		Glyph: GlyphDebt,
	},
	{
		h: "Speak Figma's structure.",
		p: 'Main → variant, literal → alias → usage: the map mirrors the model you already build in, so the plan replicates into Figma or code without translation.',
		Glyph: GlyphStructure,
	},
	{
		h: 'A second pair of eyes.',
		p: 'Cmd+K calls the design-system advisor for an on-demand architecture review of the map — naming what a tired team stopped seeing.',
		Glyph: GlyphAdvisor,
	},
];

function Row({ row }: { row: (typeof ROWS)[number] }) {
	const { ref, on } = useInViewOnce<HTMLDivElement>();
	return (
		<div className="lp-row" ref={ref}>
			<h3>{row.h}</h3>
			<p>{row.p}</p>
			<row.Glyph on={on} />
		</div>
	);
}

export function Benefits() {
	return (
		<section className="lp-ledger" aria-label="Why map first">
			<div className="lp-ledger-inner">
				<div className="lp-ledger-head">
					<h2 className="lp-h2">Why teams map first</h2>
					<p>The payoff is not a prettier diagram. It is fewer wrong structures surviving into the library.</p>
				</div>
				{ROWS.map((r) => (
					<Row key={r.h} row={r} />
				))}
			</div>
		</section>
	);
}
