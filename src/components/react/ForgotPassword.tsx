import { useState, type SyntheticEvent } from 'react';
import { AppProvider, ApiError, useApp, type PasswordResetResponse } from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';

const inputClass =
	'input input-bordered mt-2 w-full';

function ForgotPasswordInner() {
	const { request } = useApp();
	const ready = useMinDelay(450);

	const [authData, setAuthData] = useState('');
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [message, setMessage] = useState('');

	if (!ready) {
		return (
			<div className="mt-8 space-y-5">
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-11 w-full rounded-xl" />
			</div>
		);
	}

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		const next: Record<string, string> = {};
		if (!authData.trim()) next.authData = 'Enter your username or email address.';
		setErrors(next);
		if (Object.keys(next).length > 0) return;

		setServerError(null);
		setSubmitting(true);
		try {
			const res = await request<PasswordResetResponse>('user/forget/password', {
				method: 'PATCH',
				body: JSON.stringify({ auth_data: authData.trim() }),
			});
			setMessage(res.message ?? 'If an account exists, a reset link has been sent to your email.');
			setDone(true);
		} catch (err) {
			setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (done) {
		return (
			<div className="py-6 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<path d="M22 2 11 13" />
						<path d="m22 2-7 20-4-9-9-4Z" />
					</svg>
				</div>
				<h2 className="mt-5 text-xl font-bold text-white">Check your email</h2>
				<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{message}</p>
				<a href="/login" className="btn btn-primary mt-6">Back to sign in</a>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
			<label className="block">
				<span className="text-sm font-medium text-slate-300">Username or email address</span>
				<input
					type="text"
					value={authData}
					onChange={(e) => setAuthData(e.target.value)}
					placeholder="you@example.com"
					className={errors.authData ? `${inputClass} border-error` : inputClass}
				/>
				{errors.authData && <span className="mt-1 block text-xs text-red-400">{errors.authData}</span>}
			</label>

			{serverError && (
				<p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
					{serverError}
				</p>
			)}

			<button type="submit" disabled={submitting} className="btn btn-primary w-full disabled:opacity-60">
				{submitting ? 'Sending…' : 'Send reset link'}
			</button>
		</form>
	);
}

export default function ForgotPassword() {
	return (
		<AppProvider>
			<ForgotPasswordInner />
		</AppProvider>
	);
}