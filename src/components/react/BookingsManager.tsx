import { useCallback, useEffect, useState } from 'react';
import {
	AppProvider,
	ApiError,
	useApp,
	type Booking,
	type BookingFetchResponse,
	type BookingMutationResponse,
	type UserResponse,
	type VehicleFetchResponse,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import { formatPrice, humanize } from '../../lib/vehicles';
import Skeleton from './Skeleton';

const STATUS_STYLES: Record<Booking['status'], string> = {
	PENDING_PAYMENT: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300',
	CONFIRMED: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
	CHECKED_OUT: 'border-brand-500/30 bg-brand-500/15 text-brand-300',
	CHECKED_IN: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
	CANCELLED: 'border-red-500/30 bg-red-500/15 text-red-300',
	REFUNDED: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
	COMPLETED: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
};

const NEXT_STATUS: Partial<Record<Booking['status'], string>> = {
	PENDING_PAYMENT: 'CONFIRMED',
	CONFIRMED: 'CHECKED_OUT',
	CHECKED_OUT: 'CHECKED_IN',
	CHECKED_IN: 'COMPLETED',
};

function StatusBadge({ status }: { status: Booking['status'] }) {
	return (
		<span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
			{status}
		</span>
	);
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function BookingsManagerInner() {
	const { auth, request } = useApp();
	const ready = useMinDelay(1000);

	const [bookings, setBookings] = useState<Booking[]>([]);
	const [vehicles, setVehicles] = useState<Record<string, string>>({});
	const [role, setRole] = useState<string>('CLIENT');
	const [checking, setChecking] = useState(true);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		if (!auth) return;
		setLoading(true);
		setError(null);
		try {
			const [bookingRes, vehicleRes] = await Promise.all([
				request<BookingFetchResponse>(`booking/fetch?id=${encodeURIComponent(auth.id)}&limit=100&offset=0`),
				request<VehicleFetchResponse>('vehicle/fetch?limit=100&offset=0').catch(() => null),
			]);
			setBookings(bookingRes.bookings ?? []);
			const map: Record<string, string> = {};
			for (const v of vehicleRes?.vehicles ?? []) {
				map[v.id] = `${humanize(v.car_make)} ${v.model}`;
			}
			setVehicles(map);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to load bookings.');
		} finally {
			setLoading(false);
		}
	}, [auth, request]);

	useEffect(() => {
		(async () => {
			if (!auth) return;
			try {
				const me = await request<UserResponse>(`user/me?id=${encodeURIComponent(auth.id)}`);
				setRole(me.user?.role ?? 'CLIENT');
			} catch {
				/* ignore */
			} finally {
				setChecking(false);
			}
		})();
	}, [auth, request]);

	useEffect(() => {
		if (ready && !checking) loadData();
	}, [ready, checking, loadData]);

	async function handleAdvance(booking: Booking) {
		if (!auth) return;
		setBusyId(booking.id);
		setMessage(null);
		setError(null);
		try {
			const res = await request<BookingMutationResponse>('booking/status', {
				method: 'PATCH',
				body: JSON.stringify({ id: auth.id, booking_id: booking.id }),
			});
			setMessage(res.message ?? `Status updated to ${res.new_status ?? ''}.`);
			await loadData();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to update status.');
		} finally {
			setBusyId(null);
		}
	}

	async function handleCancel(bookingId: string) {
		if (!auth) return;
		setBusyId(bookingId);
		setMessage(null);
		setError(null);
		try {
			const res = await request<BookingMutationResponse>('booking/cancel', {
				method: 'PATCH',
				body: JSON.stringify({ id: auth.id, booking_id: bookingId }),
			});
			setMessage(res.message ?? 'Booking cancelled.');
			setConfirmCancelId(null);
			await loadData();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to cancel booking.');
		} finally {
			setBusyId(null);
		}
	}

	if (!auth) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
				<h1 className="text-2xl font-bold tracking-tight text-white">Bookings</h1>
				<p className="mt-2 text-sm text-slate-400">Sign in to view your bookings.</p>
				<a href="/login" className="btn btn-primary mt-6">Sign in</a>
			</div>
		);
	}

	if (!ready || checking) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="mt-4 h-20 w-full" />
				<Skeleton className="mt-3 h-20 w-full" />
				<Skeleton className="mt-3 h-20 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-white">Your bookings</h1>
						<p className="mt-1 text-sm text-slate-400">View and manage your vehicle bookings.</p>
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

				{message && (
					<p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</p>
				)}
				{error && (
					<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>
				)}

				{loading ? (
					<div className="mt-4 space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-24 w-full" />
						))}
					</div>
				) : bookings.length === 0 ? (
					<p className="mt-4 text-sm text-slate-400">No bookings yet.</p>
				) : (
					<div className="mt-4 space-y-3">
						{bookings.map((b) => {
							const cancellable = (b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED') && b.client_id === auth.id;
							const canAdvance = role === 'ADMIN' || role === 'MERCHANT';
							const next = NEXT_STATUS[b.status];
							return (
								<div key={b.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<div className="flex flex-wrap items-center gap-3">
												<h3 className="font-semibold text-white">{vehicles[b.vehicle_id] ?? b.vehicle_id}</h3>
												<StatusBadge status={b.status} />
											</div>
											<p className="mt-1 text-sm text-slate-400">
												{formatDate(b.start_date)} → {formatDate(b.end_date)}
											</p>
											<p className="mt-1 text-xs text-slate-500">
												Pickup: {b.pickup_location || '—'} · Dropoff: {b.dropoff_location || '—'}
											</p>
										</div>

										<div className="flex items-center gap-2">
											{confirmCancelId === b.id ? (
												<>
													<span className="text-sm text-red-300">Cancel this booking?</span>
													<button type="button" onClick={() => setConfirmCancelId(null)} disabled={busyId === b.id} className="btn btn-outline btn-sm">Keep</button>
													<button type="button" onClick={() => handleCancel(b.id)} disabled={busyId === b.id} className="btn btn-error btn-sm">
														{busyId === b.id ? '…' : 'Yes'}
													</button>
												</>
											) : (
												<>
													{canAdvance && next && (
														<button type="button" onClick={() => handleAdvance(b)} disabled={busyId === b.id} className="btn btn-outline btn-secondary btn-sm">
															{busyId === b.id ? '…' : `Advance to ${next}`}
														</button>
													)}
													{cancellable && (
														<button type="button" onClick={() => setConfirmCancelId(b.id)} disabled={busyId === b.id} className="btn btn-outline btn-error btn-sm">
															Cancel
														</button>
													)}
												</>
											)}
										</div>
									</div>

									{b.financial_snapshot && (
										<div className="mt-3 grid gap-x-8 gap-y-1 border-t border-white/10 pt-3 text-xs text-slate-400 sm:grid-cols-3 lg:grid-cols-6">
											<span>Rate: {formatPrice(b.financial_snapshot.daily_rate_cents)}</span>
											<span>{b.financial_snapshot.total_days} days</span>
											<span>Subtotal: {formatPrice(b.financial_snapshot.subtotal_cents)}</span>
											<span>Insurance: {formatPrice(b.financial_snapshot.insurance_fee_cents)}</span>
											<span>Tax: {formatPrice(b.financial_snapshot.tax_cents)}</span>
											<span className="font-semibold text-white">Total: {formatPrice(b.financial_snapshot.total_amount_cents)}</span>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}

export default function BookingsManager() {
	return (
		<AppProvider>
			<BookingsManagerInner />
		</AppProvider>
	);
}