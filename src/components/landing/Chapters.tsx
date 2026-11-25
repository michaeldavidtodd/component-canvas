import { useEffect, useRef, useState } from 'react';
import { EvolutionMap } from './map';

const CHAPTERS = [
	{
		h: 'Map the system.',
		p: 'Every component, variant, and token lives on one canvas with real semantics — not boxes and arrows you have to explain in a doc. The map is the plan, not a picture of it.',
	},
	{
		h: 'Read it as a table.',
		p: 'Flip to the structured map: columns are hierarchy levels — main component to variant, literal to alias to usage — and rows are leaves. The same truth, sorted for a review pass.',
	},
	{
		h: 'Trace every token to its usage.',
		p: 'Follow a value from its literal definition through its alias to the component it paints. Dead ends and broken chains read as gaps in the map — not surprises in production.',
	},
	{
		h: 'Hand the team a link.',
		p: 'One read-only link carries the whole plan, current as the system moves. No exports, no stale screenshots, no “which version is this?”',
	},
];

/* How it works: one node set, four states. Each chapter rests in its own
   state; the first time it scrolls into view it animates in from the previous
   chapter's arrangement, so the visitor watches the same map evolve. */
function Chapter({ c, i }: { c: (typeof CHAPTERS)[number]; i: number }) {
	const ref = useRef<HTMLDivElement>(null);
	const [pose, setPose] = useState(i);

	useEffect(() => {
		const el = ref.current;
		if (!el || i === 0) return;
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					io.disconnect();
					setPose(Math.max(0, i - 1));
					requestAnimationFrame(() =>
						requestAnimationFrame(() => setPose(i)),
					);
				}
			},
			{ threshold: 0.45 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [i]);

	return (
		<div className="lp-chapter" ref={ref}>
			<div className="lp-chapter-inner">
				<h3>{c.h}</h3>
				<p>{c.p}</p>
				</div>
			<EvolutionMap state={pose} />
		</div>
	);
}

export function Chapters() {
	return (
		<section className="lp-chapters" aria-label="How it works">
			<div className="lp-chapters-head">
				<h2 className="lp-h2">How the map works</h2>
				<p>Four states of the same system. Scroll — the map rearranges itself.</p>
			</div>
			<div className="lp-chapters-grid">
				{CHAPTERS.map((c, i) => (
					<Chapter key={c.h} c={c} i={i} />
				))}
			</div>
		</section>
	);
}
