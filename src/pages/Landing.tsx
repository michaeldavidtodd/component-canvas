import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Hero } from '@/components/landing/Hero';
import { Chapters } from '@/components/landing/Chapters';
import { Benefits } from '@/components/landing/Benefits';
import { Closing } from '@/components/landing/Closing';
import '@/components/landing/landing.css';

const Landing = () => {
	const { user, isAnonymous, switchToAnonymous } = useAuth();
	const navigate = useNavigate();
	const signedIn = !!user && !isAnonymous;

	useEffect(() => {
		const prevBg = document.body.style.backgroundColor;
		const prevScroll = document.documentElement.style.scrollbarColor;
		document.body.style.backgroundColor = '#05070f';
		document.documentElement.style.scrollbarColor = '#26304e #05070f';
		return () => {
			document.body.style.backgroundColor = prevBg;
			document.documentElement.style.scrollbarColor = prevScroll;
		};
	}, []);

	const handleGuest = () => {
		switchToAnonymous();
		navigate('/app');
	};

	return (
		<div className="lp">
			<Hero signedIn={signedIn} onGuest={handleGuest} />

			<section className="lp-statement" aria-label="The problem">
				<div className="lp-statement-inner">
					<h2 className="lp-h2">
						Component systems don't fail in the components. They fail in the seams.
					</h2>
					<p>
						The variant nobody documented. The alias that points nowhere. The hierarchy three
						teams remember three ways. <strong>Component Canvas makes the seams visible</strong>{' '}
						while changing them is still cheap — before a wrong structure gets built, adopted,
						and defended.
					</p>
				</div>
			</section>

			<Chapters />
			<Benefits />
			<Closing signedIn={signedIn} onGuest={handleGuest} />

			<footer className="lp-footer">
				<span className="lp-brand">
					<span className="lp-mark" aria-hidden="true"><i /><i /><i /><i /></span>
					<span className="lp-mono" style={{ color: 'var(--lp-ink)' }}>Component Canvas</span>
				</span>
				<span className="lp-mono">
					Modeled on Figma's structure — no plugin, no sync · Demonstrations use synthetic data
				</span>
				<nav className="lp-footer-links" aria-label="Footer">
					{signedIn ? (
						<Link className="lp-mono" to="/app" data-textlink>Open app</Link>
					) : (
						<>
							<Link className="lp-mono" to="/auth" data-textlink>Sign in</Link>
							<Link className="lp-mono" to="/auth?mode=signup" data-textlink>Start free</Link>
						</>
					)}
				</nav>
			</footer>
		</div>
	);
};

export default Landing;
