import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function Closing({ signedIn, onGuest }: { signedIn: boolean; onGuest: () => void }) {
	const [email, setEmail] = useState('');
	const navigate = useNavigate();

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const q = email.trim();
		navigate(`/auth?mode=signup${q ? `&email=${encodeURIComponent(q)}` : ''}`);
	};

	return (
		<section className="lp-close" aria-label="Sign up">
			<h2>Start with the map.</h2>
			<p className="lp-sub">
				Sign-up is open and free. Bring your next component, variant, or token —
				leave with a plan your team can actually build.
			</p>
			{signedIn ? (
				<div className="lp-form">
					<Link className="lp-btn lp-btn-fill" to="/app">Open app</Link>
				</div>
			) : (
				<>
					<form className="lp-form" onSubmit={submit}>
						<label htmlFor="lp-email" className="sr-only">Work email</label>
						<input
							id="lp-email"
							className="lp-email"
							type="email"
							placeholder="you@company.com"
							autoComplete="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
						<button type="submit" className="lp-btn lp-btn-fill">Start free</button>
					</form>
					<p className="lp-smallprint">
						Prefer to look first?{' '}
						<a href="#" data-textlink onClick={(e) => { e.preventDefault(); onGuest(); }}>
							Continue as guest
						</a>{' '}
						— no account, no saving. macOS app coming soon.
					</p>
				</>
			)}
		</section>
	);
}
