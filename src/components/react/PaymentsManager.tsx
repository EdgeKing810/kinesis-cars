import { useCallback, useEffect, useState } from 'react';
import {
	AppProvider,
	ApiError,
	useApp,
	type PaymentFetchResponse,
	type PaymentTransaction,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import { formatPrice } from '../../lib/vehicles';
import Skeleton from './Skeleton';

const STATUS_STYLES: Record<PaymentTransaction['status'], string> = {
	PENDING: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300',
	AUTHORIZED: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
	CAPTURED: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
	FAILED: 'border-red-500/30 bg-red-500/15 text-red-300',
	REFUNDED: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
	PARTIALLY_REFUNDED: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
};

function StatusBadge({ status }: { status: PaymentTransaction['status'] }) {
	return (
		<span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
			{status}
		</span>
	);
}

function PaymentsManagerInner() {
	const { auth, request } = useApp();
	const ready = useMinDelay(1000);
	const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		if (!auth) return;
		setLoading(true);
		setError(null);
		try {
			const res = await request<PaymentFetchResponse>(
				`payment/fetch?id=${encodeURIComponent(auth.id)}&limit=100&offset=0`,
			);
			setTransactions(res.bookings ?? []);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to load payment transactions.');
		} finally {
			setLoading(false);
		}
	}, [auth, request]);

	useEffect(() => {
		if (ready) loadData();
	}, [ready, loadData]);

	if (!auth) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
				<h1 className="text-2xl font-bold tracking-tight text-white">Payments</h1>
				<p className="mt-2 text-sm text-slate-400">Sign in to view your payment transactions.</p>
				<a href="/login" className="btn btn-primary mt-6">Sign in</a>
			</div>
		);
	}

	if (!ready) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="mt-4 h-16 w-full" />
				<Skeleton className="mt-3 h-16 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-white">Payment transactions</h1>
						<p className="mt-1 text-sm text-slate-400">A history of payments made through the platform.</p>
					</div>
					<button
						type="button"
						onClick={() => loadData()}
						disabled={loading}
						className="btn btn-outline btn-info btn-sm disabled:opacity-60"
					>
						Refresh
					</button>
				</div>

				{error && (
					<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>
				)}

				{loading ? (
					<div className="mt-4 space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				) : transactions.length === 0 ? (
					<p className="mt-4 text-sm text-slate-400">No payment transactions yet.</p>
				) : (
					<div className="mt-4 space-y-3">
						{transactions.map((t) => (
							<div key={t.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
								<div>
									<div className="flex flex-wrap items-center gap-3">
										<span className="font-semibold text-white">{formatPrice(t.amount_cents)}</span>
										<StatusBadge status={t.status} />
										<span className="text-xs text-slate-500">{t.currency}</span>
									</div>
									<p className="mt-1 text-xs text-slate-500">
										{t.provider} · Booking {t.booking_id}
									</p>
									{t.failure_reason && <p className="mt-1 text-xs text-red-300">{t.failure_reason}</p>}
								</div>
								<p className="text-xs text-slate-500">
									{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
								</p>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

export default function PaymentsManager() {
	return (
		<AppProvider>
			<PaymentsManagerInner />
		</AppProvider>
	);
}