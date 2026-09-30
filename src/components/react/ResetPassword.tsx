import { useEffect, useState, type SyntheticEvent } from 'react';
import { AppProvider, ApiError, useApp, type PasswordResetResponse } from '../../context/AppContext';
import { isValidPassword } from '../../lib/validation';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';
import PasswordInput from './PasswordInput';

const inputClass =
	'input input-bordered mt-2 w-full';

function ResetPasswordInner() {
	const { request } = useApp();
	const minElapsed = useMinDelay(450);

	const [params, setParams] = useState<{ id: string; token: string } | null>(null);
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [message, setMessage] = useState('');

	useEffect(() => {
		const search = new URLSearchParams(window.location.search);
		setParams({ id: search.get('id') ?? '', token: search.get('token') ?? '' });
	}, []);

	const validParams = params !== null && params.id !== '' && params.token !== '';

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!validParams || !params) return;

		const next: Record<string, string> = {};
		if (!password) next.password = 'Enter a new password.';
		else if (!isValidPassword(password))
			next.password = 'Password needs 1 lowercase, 1 uppercase, 1 symbol and 8+ characters.';
		setErrors(next);
		if (Object.keys(next).length > 0) return;

		setServerError(null);
		setSubmitting(true);
		try {
			const res = await request<PasswordResetResponse>('user/reset/password', {
				method: 'PATCH',
				body: JSON.stringify({ id: params.id, token: params.token, password }),
			});
			setMessage(res.message ?? 'Your password has been reset. You can now sign in.');
			setDone(true);
		} catch (err) {
			setServerError(err instanceof ApiError ? err.message : 'Reset failed. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (!minElapsed) {
		return (
			<div className="mt-8 space-y-5">
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-11 w-full rounded-xl" />
			</div>
		);
	}

	if (!validParams) {
		return (
			<div className="py-6 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</div>
				<h2 className="mt-5 text-xl font-bold text-white">Invalid reset link</h2>
				<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-red-300">
					This link is missing the required id and token parameters.
				</p>
				<a href="/auth/forgot" className="btn btn-outline btn-info mt-6">Request a new link</a>
			</div>
		);
	}

	if (done) {
		return (
			<div className="py-6 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<path d="M20 6 9 17l-5-5" />
					</svg>
				</div>
				<h2 className="mt-5 text-xl font-bold text-white">Password reset</h2>
				<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{message}</p>
				<a href="/login" className="btn btn-primary mt-6">Go to sign in</a>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
			<label className="block">
				<span className="text-sm font-medium text-slate-300">New password</span>
				<PasswordInput
					value={password}
					onChange={setPassword}
					autoComplete="new-password"
					placeholder="1 lowercase, 1 uppercase, 1 symbol, 8+ characters"
					className={errors.password ? `${inputClass} border-error` : inputClass}
				/>
				{errors.password && <span className="mt-1 block text-xs text-red-400">{errors.password}</span>}
			</label>

			{serverError && (
				<p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
					{serverError}
				</p>
			)}

			<button type="submit" disabled={submitting} className="btn btn-primary w-full disabled:opacity-60">
				{submitting ? 'Resetting…' : 'Reset password'}
			</button>
		</form>
	);
}

export default function ResetPassword() {
	return (
		<AppProvider>
			<ResetPasswordInner />
		</AppProvider>
	);
}