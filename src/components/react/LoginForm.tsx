import { useState, type SyntheticEvent } from 'react';
import { AppProvider, ApiError, useApp } from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';

function LoginFormInner() {
	const { login, auth } = useApp();
	const ready = useMinDelay(450);
	const [authData, setAuthData] = useState('');
	const [password, setPassword] = useState('');
	const [otpCode, setOtpCode] = useState('');
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [signedIn, setSignedIn] = useState(false);

	const inputClass = (field: string) =>
		`input input-bordered mt-2 w-full ${errors[field] ? 'border-error' : ''}`;

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		const next: Record<string, string> = {};
		if (!authData.trim()) next.authData = 'Enter your username or email address.';
		if (!password) next.password = 'Enter your password.';
		setErrors(next);
		if (Object.keys(next).length > 0) return;

		setServerError(null);
		setSubmitting(true);
		try {
			await login(authData.trim(), password, otpCode.trim() || undefined);
			setSignedIn(true);
			const params = new URLSearchParams(window.location.search);
			const next = params.get('next');
			const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
			setTimeout(() => {
				window.location.href = target;
			}, 900);
		} catch (err) {
			setServerError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (!ready) {
		return (
			<div className="mt-8 space-y-5">
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-5 w-full" />
				<Skeleton className="h-11 w-full rounded-xl" />
			</div>
		);
	}

	if (signedIn) {
		return (
			<div className="py-6 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<path d="M20 6 9 17l-5-5" />
					</svg>
				</div>
				<h2 className="mt-5 text-xl font-bold text-white">Signed in</h2>
				<p className="mt-2 text-sm text-slate-400">Taking you back to the homepage…</p>
			</div>
		);
	}

	if (auth) {
		return (
			<div className="py-6 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
				</div>
				<h2 className="mt-5 text-xl font-bold text-white">You're already signed in</h2>
				<p className="mt-2 text-sm text-slate-400">Manage your profile and security settings from your account.</p>
				<a href="/account" className="btn btn-primary mt-6">Go to your account</a>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
			<label className="block">
				<span className="text-sm font-medium text-slate-300">Username or email address</span>
				<input
					type="text"
					name="auth_data"
					value={authData}
					onChange={(e) => setAuthData(e.target.value)}
					autoComplete="username"
					placeholder="you@example.com"
					className={inputClass('authData')}
				/>
				{errors.authData && <span className="mt-1 block text-xs text-red-400">{errors.authData}</span>}
			</label>

			<label className="block">
				<span className="text-sm font-medium text-slate-300">Password</span>
				<input
					type="password"
					name="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoComplete="current-password"
					placeholder="••••••••"
					className={inputClass('password')}
				/>
				{errors.password && <span className="mt-1 block text-xs text-red-400">{errors.password}</span>}
			</label>

			<label className="block">
				<span className="text-sm font-medium text-slate-300">
					Two-factor code <span className="font-normal text-slate-500">(optional)</span>
				</span>
				<input
					type="text"
					name="otp_code"
					value={otpCode}
					onChange={(e) => setOtpCode(e.target.value)}
					autoComplete="one-time-code"
					inputMode="numeric"
					placeholder="000000"
					className={inputClass('otp')}
				/>
			</label>

			<div className="flex items-center justify-between text-sm">
				<label className="flex items-center gap-2 text-slate-400">
					<input type="checkbox" name="remember" className="h-4 w-4 rounded border-white/20 bg-slate-950 accent-brand-500" />
					Remember me
				</label>
				<a href="/auth/forgot" className="text-sm font-medium text-brand-400 transition hover:text-brand-300">Forgot password?</a>
			</div>

			{serverError && (
				<p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
					{serverError}
				</p>
			)}

			<button
				type="submit"
				disabled={submitting}
				className="btn btn-primary w-full disabled:opacity-60"
			>
				{submitting ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	);
}

export default function LoginForm() {
	return (
		<AppProvider>
			<LoginFormInner />
		</AppProvider>
	);
}