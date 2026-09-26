import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import {
	ApiError,
	useApp,
	type Blockout,
	type BlockoutFetchResponse,
	type BlockoutMutationResponse,
	type Vehicle,
} from '../../context/AppContext';
import Skeleton from './Skeleton';
import { localDateTimeToApi } from '../../lib/dates';

const REASONS = ['MAINTENANCE', 'FLEET_HOLD', 'UNAVAILABLE'] as const;

function ReasonBadge({ reason }: { reason: Blockout['reason'] }) {
	const styles: Record<Blockout['reason'], string> = {
		BOOKING: 'border-brand-500/30 bg-brand-500/15 text-brand-300',
		MAINTENANCE: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300',
		FLEET_HOLD: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
		UNAVAILABLE: 'border-red-500/30 bg-red-500/15 text-red-300',
	};
	return (
		<span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[reason]}`}>{reason}</span>
	);
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function VehicleBlockouts({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
	const { auth, request } = useApp();

	const [blockouts, setBlockouts] = useState<Blockout[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const [start, setStart] = useState('');
	const [end, setEnd] = useState('');
	const [reason, setReason] = useState<(typeof REASONS)[number]>('MAINTENANCE');
	const [note, setNote] = useState('');
	const [creating, setCreating] = useState(false);
	const [deleting, setDeleting] = useState<string | null>(null);

	const fetchBlockouts = useCallback(async () => {
		if (!auth) return;
		setLoading(true);
		setError(null);
		try {
			const res = await request<BlockoutFetchResponse>(
				`blockout/fetch?id=${encodeURIComponent(auth.id)}&vehicle_id=${encodeURIComponent(vehicle.id)}&limit=100&offset=0`,
			);
			setBlockouts(res.blockouts ?? []);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to load blockouts.');
		} finally {
			setLoading(false);
		}
	}, [auth, request, vehicle.id]);

	useEffect(() => {
		fetchBlockouts();
	}, [fetchBlockouts]);

	async function handleCreate(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!auth || !start.trim() || !end.trim()) return;
		const apiStart = localDateTimeToApi(start);
		const apiEnd = localDateTimeToApi(end);
		if (!apiStart || !apiEnd) {
			setError('Please pick valid start and end dates/times.');
			return;
		}
		setMessage(null);
		setError(null);
		setCreating(true);
		try {
			const res = await request<BlockoutMutationResponse>('blockout/create', {
				method: 'POST',
				body: JSON.stringify({
					id: auth.id,
					vehicle_id: vehicle.id,
					start_date: apiStart,
					end_date: apiEnd,
					reason,
					note: note.trim(),
				}),
			});
			setMessage(res.message ?? 'Blockout created.');
			setStart('');
			setEnd('');
			setNote('');
			await fetchBlockouts();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to create blockout.');
		} finally {
			setCreating(false);
		}
	}

	async function handleDelete(blockoutId: string) {
		if (!auth) return;
		setMessage(null);
		setError(null);
		setDeleting(blockoutId);
		try {
			const res = await request<BlockoutMutationResponse>(
				`blockout/delete?id=${encodeURIComponent(auth.id)}&blockout_id=${encodeURIComponent(blockoutId)}`,
				{ method: 'DELETE' },
			);
			setMessage(res.message ?? 'Blockout deleted.');
			await fetchBlockouts();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to delete blockout.');
		} finally {
			setDeleting(null);
		}
	}

	return (
		<div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
			<div className="flex items-center justify-between gap-4">
				<h4 className="text-sm font-semibold text-white">Blockouts</h4>
				<button type="button" onClick={onClose} className="btn btn-ghost btn-xs">
					Close
				</button>
			</div>

			{message && (
				<p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
					{message}
				</p>
			)}
			{error && (
				<p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</p>
			)}

			{loading ? (
				<div className="mt-3 space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			) : blockouts.length === 0 ? (
				<p className="mt-3 text-sm text-slate-400">No blockouts for this vehicle.</p>
			) : (
				<div className="mt-3 space-y-2">
					{blockouts.map((b) => (
						<div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
							<div>
								<div className="flex flex-wrap items-center gap-2">
									<ReasonBadge reason={b.reason} />
									<span className="text-xs text-slate-400">
										{formatDate(b.start_date)} → {formatDate(b.end_date)}
									</span>
								</div>
								{b.note && <p className="mt-1 text-xs text-slate-500">{b.note}</p>}
							</div>
							<button
								type="button"
								onClick={() => handleDelete(b.id)}
								disabled={deleting === b.id}
								className="btn btn-outline btn-error btn-xs"
							>
								{deleting === b.id ? 'Deleting…' : 'Delete'}
							</button>
						</div>
					))}
				</div>
			)}

			<form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<label className="block">
					<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Start</span>
					<input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required className="input input-bordered input-sm mt-1 w-full" />
				</label>
				<label className="block">
					<span className="text-xs font-medium uppercase tracking-wide text-slate-500">End</span>
					<input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required className="input input-bordered input-sm mt-1 w-full" />
				</label>
				<label className="block">
					<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Reason</span>
					<select value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])} className="select select-bordered select-sm mt-1 w-full">
						{REASONS.map((r) => (
							<option key={r} value={r}>{r}</option>
						))}
					</select>
				</label>
				<label className="block">
					<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Note</span>
					<input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" className="input input-bordered input-sm mt-1 w-full" />
				</label>
				<div className="sm:col-span-2 lg:col-span-4">
					<button type="submit" disabled={creating} className="btn btn-primary btn-sm disabled:opacity-60">
						{creating ? 'Creating…' : 'Add blockout'}
					</button>
				</div>
			</form>
		</div>
	);
}