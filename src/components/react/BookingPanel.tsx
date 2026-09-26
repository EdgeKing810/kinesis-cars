import { useState, type SyntheticEvent } from 'react';
import {
	ApiError,
	useApp,
	type BookingCreateResponse,
	type FinancialSnapshot,
	type Vehicle,
} from '../../context/AppContext';
import { formatPrice } from '../../lib/vehicles';
import { localDateTimeToApi } from '../../lib/dates';

function MoneyRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
	return (
		<div className="flex items-center justify-between text-sm">
			<span className={strong ? 'font-semibold text-white' : 'text-slate-400'}>{label}</span>
			<span className={strong ? 'font-bold text-brand-400' : 'text-slate-300'}>{value}</span>
		</div>
	);
}

export default function BookingPanel({ vehicle }: { vehicle: Vehicle }) {
	const { auth, request } = useApp();
	const [pickup, setPickup] = useState('');
	const [dropoff, setDropoff] = useState('');
	const [start, setStart] = useState('');
	const [end, setEnd] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<FinancialSnapshot | null>(null);
	const [bookingId, setBookingId] = useState('');

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!auth) return;
		const apiStart = localDateTimeToApi(start);
		const apiEnd = localDateTimeToApi(end);
		if (!apiStart || !apiEnd) {
			setError('Please pick valid start and end dates/times.');
			return;
		}
		if (!pickup.trim() || !dropoff.trim()) {
			setError('Pickup and dropoff locations are required.');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const res = await request<BookingCreateResponse>('booking/create', {
				method: 'POST',
				body: JSON.stringify({
					id: auth.id,
					vehicle_id: vehicle.id,
					start_date: apiStart,
					end_date: apiEnd,
					pickup_location: pickup.trim(),
					dropoff_location: dropoff.trim(),
				}),
			});
			setBookingId(res.id);
			setResult(res.financial_snapshot ?? null);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Booking failed. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (result) {
		return (
			<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
				<p className="text-sm font-semibold text-emerald-300">Booking created — pending payment</p>
				<p className="mt-1 text-xs text-slate-400">Booking ID: {bookingId}</p>

				<div className="mt-4 space-y-2">
					<MoneyRow label={`Daily rate (${result.total_days} day${result.total_days !== 1 ? 's' : ''})`} value={formatPrice(result.daily_rate_cents)} />
					<MoneyRow label="Subtotal" value={formatPrice(result.subtotal_cents)} />
					<MoneyRow label="Insurance fee" value={formatPrice(result.insurance_fee_cents)} />
					<MoneyRow label="Deposit" value={formatPrice(result.deposit_cents)} />
					<MoneyRow label="Tax" value={formatPrice(result.tax_cents)} />
					<div className="border-t border-white/10 pt-2">
						<MoneyRow label="Total" value={formatPrice(result.total_amount_cents)} strong />
					</div>
				</div>

				<p className="mt-4 text-xs text-slate-400">
					You'll be asked to complete the payment separately. You can view or cancel this booking from your bookings page.
				</p>
				<a href="/bookings" className="btn btn-primary btn-sm mt-4">View my bookings</a>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-5" noValidate>
			<p className="text-sm text-slate-300">
				Rent from <span className="font-semibold text-white">{formatPrice(vehicle.price_per_day_cents)}</span>,{' '}
				minimum {vehicle.min_rent_days} day{vehicle.min_rent_days !== 1 ? 's' : ''}
				{vehicle.max_rent_days < 999 && ` up to ${vehicle.max_rent_days} days`}.
			</p>

			<div className="mt-4 grid gap-3 sm:grid-cols-2">
				<label className="block">
					<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Pickup location</span>
					<input type="text" value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="e.g. Grand Gaube" className="input input-bordered input-sm mt-1 w-full" />
				</label>
				<label className="block">
					<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Dropoff location</span>
					<input type="text" value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="e.g. Riviere Noire" className="input input-bordered input-sm mt-1 w-full" />
				</label>
				<label className="block">
					<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Start</span>
					<input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required className="input input-bordered input-sm mt-1 w-full" />
				</label>
				<label className="block">
					<span className="text-xs font-medium uppercase tracking-wide text-slate-500">End</span>
					<input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required className="input input-bordered input-sm mt-1 w-full" />
				</label>
			</div>

			{error && <p className="mt-3 text-sm text-red-300">{error}</p>}

			<button type="submit" disabled={submitting} className="btn btn-primary btn-sm mt-4 disabled:opacity-60">
				{submitting ? 'Creating booking…' : 'Book this car'}
			</button>
		</form>
	);
}