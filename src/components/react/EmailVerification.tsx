import { useEffect, useState } from 'react';
import { AppProvider, ApiError, useApp, type ApiEnvelope } from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';

type Status = 'loading' | 'success' | 'error';

function EmailVerificationInner() {
	const { request } = useApp();
	const minElapsed = useMinDelay(1000);
	const [status, setStatus] = useState<Status>('loading');
	const [message, setMessage] = useState('');

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const id = params.get('id') ?? '';
		const token = params.get('token') ?? '';

		if (!id || !token) {
			setStatus('error');
			setMessage('This verification link is missing the required id and token parameters.');
			return;
		}

		const query = new URLSearchParams({ id, token }).toString();
		request<ApiEnvelope>(`auth/email/verify?${query}`)
			.then((body) => {
				setStatus('success');
				setMessage(body.message ?? 'Your email address has been verified. You can now sign in.');
			})
			.catch((err) => {
				setStatus('error');
				setMessage(err instanceof ApiError ? err.message : 'Email verification failed. Please try again.');
			});
	}, [request]);

	return (
		<div className="py-6 text-center">
			{status === 'loading' || !minElapsed ? (
				<>
					<Skeleton className="mx-auto h-14 w-14 rounded-full" />
					<Skeleton className="mx-auto mt-5 h-6 w-48" />
					<Skeleton className="mx-auto mt-3 h-4 w-64" />
				</>
			) : status === 'success' ? (
				<>
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
							<path d="M20 6 9 17l-5-5" />
						</svg>
					</div>
					<h2 className="mt-5 text-xl font-bold text-white">Email verified</h2>
					<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{message}</p>
					<a href="/login" className="btn btn-primary mt-6">
						Go to sign in
					</a>
				</>
			) : (
				<>
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					</div>
					<h2 className="mt-5 text-xl font-bold text-white">Verification failed</h2>
					<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-red-300">{message}</p>
					<a href="/" className="btn btn-outline btn-secondary mt-6">
						Back to home
					</a>
				</>
			)}
		</div>
	);
}

export default function EmailVerification() {
	return (
		<AppProvider>
			<EmailVerificationInner />
		</AppProvider>
	);
}