import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import {
	AppProvider,
	ApiError,
	useApp,
	type Fleet,
	type FleetFetchResponse,
	type FleetMutationResponse,
	type UserResponse,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';

const inputClass = 'input input-bordered mt-2 w-full';

function FleetsManagerInner() {
	const { auth, request } = useApp();
	const ready = useMinDelay(1000);

	const [checking, setChecking] = useState(true);
	const [allowed, setAllowed] = useState(false);
	const [accessError, setAccessError] = useState<string | null>(null);

	const [fleets, setFleets] = useState<Fleet[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const [name, setName] = useState('');
	const [agency, setAgency] = useState('');
	const [creating, setCreating] = useState(false);

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState('');
	const [editAgency, setEditAgency] = useState('');
	const [savingId, setSavingId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const fetchFleets = useCallback(async () => {
		if (!auth) return;
		setLoading(true);
		setError(null);
		try {
			const res = await request<FleetFetchResponse>('fleet/fetch?limit=100&offset=0');
			setFleets((res.fleets ?? []).filter((f) => f.owner_id === auth.id));
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to load fleets.');
		} finally {
			setLoading(false);
		}
	}, [auth, request]);

	// Only ADMIN and MERCHANT users can manage fleets.
	useEffect(() => {
		(async () => {
			if (!auth) return;
			setAccessError(null);
			try {
				const me = await request<UserResponse>(`user/me?id=${encodeURIComponent(auth.id)}`);
				const role = me.user?.role;
				setAllowed(role === 'ADMIN' || role === 'MERCHANT');
			} catch (err) {
				setAccessError(err instanceof ApiError ? err.message : 'Failed to verify access.');
			} finally {
				setChecking(false);
			}
		})();
	}, [auth, request]);

	useEffect(() => {
		if (allowed) fetchFleets();
	}, [allowed, fetchFleets]);

	function clearFeedback() {
		setMessage(null);
		setError(null);
	}

	async function handleCreate(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!auth || !name.trim()) return;
		clearFeedback();
		setCreating(true);
		try {
			const res = await request<FleetMutationResponse>('fleet/create', {
				method: 'POST',
				body: JSON.stringify({ id: auth.id, name: name.trim(), agency: agency.trim() }),
			});
			setMessage(res.message ?? 'Fleet created.');
			setName('');
			setAgency('');
			await fetchFleets();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to create fleet.');
		} finally {
			setCreating(false);
		}
	}

	function startEdit(fleet: Fleet) {
		setEditingId(fleet.id);
		setEditName(fleet.name);
		setEditAgency(fleet.agency);
		setConfirmDeleteId(null);
	}

	async function handleUpdate() {
		if (!auth || !editingId || !editName.trim()) return;
		clearFeedback();
		setSavingId(editingId);
		try {
			const res = await request<FleetMutationResponse>('fleet/update', {
				method: 'PUT',
				body: JSON.stringify({
					id: auth.id,
					fleet_id: editingId,
					name: editName.trim(),
					agency: editAgency.trim(),
				}),
			});
			setMessage(res.message ?? 'Fleet updated.');
			setEditingId(null);
			await fetchFleets();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to update fleet.');
		} finally {
			setSavingId(null);
		}
	}

	async function handleDelete(fleetId: string) {
		if (!auth) return;
		clearFeedback();
		setSavingId(fleetId);
		try {
			const res = await request<FleetMutationResponse>(
				`fleet/delete?id=${encodeURIComponent(auth.id)}&fleet_id=${encodeURIComponent(fleetId)}`,
				{ method: 'DELETE' },
			);
			setMessage(res.message ?? 'Fleet deleted.');
			setConfirmDeleteId(null);
			await fetchFleets();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to delete fleet.');
		} finally {
			setSavingId(null);
		}
	}

	if (ready && !checking && !auth) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
				<h1 className="text-2xl font-bold tracking-tight text-white">Fleets</h1>
				<p className="mt-2 text-sm text-slate-400">Sign in to manage your fleets.</p>
				<a href="/login" className="btn btn-primary mt-6">Sign in</a>
			</div>
		);
	}

	if (!ready || checking) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="mt-4 h-11 w-full" />
				<Skeleton className="mt-6 h-16 w-full" />
				<Skeleton className="mt-3 h-16 w-full" />
			</div>
		);
	}

	if (accessError) {
		return (
			<div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-6 text-center">
				<p className="text-sm text-red-300">{accessError}</p>
				<a href="/login" className="btn btn-error btn-sm mt-4">Sign in again</a>
			</div>
		);
	}

	if (!allowed) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
				<h1 className="text-2xl font-bold tracking-tight text-white">Fleets</h1>
				<p className="mt-2 text-sm text-slate-400">
					Only merchants and administrators can create and manage fleets.
				</p>
				<a href="/" className="btn btn-outline mt-6">Back to home</a>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-white">Your fleets</h1>
						<p className="mt-1 text-sm text-slate-400">
							Group your vehicles into fleets for easy management.
						</p>
					</div>
					<button
						type="button"
						onClick={() => fetchFleets()}
						disabled={loading}
						className="btn btn-outline btn-info btn-sm disabled:cursor-not-allowed disabled:opacity-60"
					>
						Refresh
					</button>
				</div>

				{message && (
					<p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
						{message}
					</p>
				)}
				{error && (
					<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
						{error}
					</p>
				)}

				<form onSubmit={handleCreate} className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
					<label className="block">
						<span className="text-sm font-medium text-slate-300">Fleet name</span>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. My first fleet"
							className={inputClass}
						/>
					</label>
					<label className="block">
						<span className="text-sm font-medium text-slate-300">
							Agency <span className="font-normal text-slate-500">(optional)</span>
						</span>
						<input
							type="text"
							value={agency}
							onChange={(e) => setAgency(e.target.value)}
							placeholder="e.g. Kinesis Agency"
							className={inputClass}
						/>
					</label>
					<button type="submit" disabled={creating || !name.trim()} className="btn btn-primary">
						{creating ? 'Creating…' : 'Create fleet'}
					</button>
				</form>
			</section>

			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				{loading && (
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				)}

				{!loading && fleets.length === 0 && (
					<p className="text-sm text-slate-400">You haven't created any fleets yet.</p>
				)}

				{!loading && fleets.length > 0 && (
					<div className="space-y-3">
						{fleets.map((fleet) => (
							<div key={fleet.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
								{editingId === fleet.id ? (
									<div className="space-y-4">
										<div className="grid gap-4 sm:grid-cols-2">
											<label className="block">
												<span className="text-sm font-medium text-slate-300">Fleet name</span>
												<input
													type="text"
													value={editName}
													onChange={(e) => setEditName(e.target.value)}
													className={inputClass}
												/>
											</label>
											<label className="block">
												<span className="text-sm font-medium text-slate-300">Agency</span>
												<input
													type="text"
													value={editAgency}
													onChange={(e) => setEditAgency(e.target.value)}
													className={inputClass}
												/>
											</label>
										</div>
										<div className="flex gap-3">
											<button
												type="button"
												onClick={handleUpdate}
												disabled={savingId === fleet.id || !editName.trim()}
												className="btn btn-primary btn-sm"
											>
												{savingId === fleet.id ? 'Saving…' : 'Save'}
											</button>
											<button
												type="button"
												onClick={() => setEditingId(null)}
												disabled={savingId === fleet.id}
												className="btn btn-outline btn-sm"
											>
												Cancel
											</button>
										</div>
									</div>
								) : (
									<div className="flex flex-wrap items-center justify-between gap-4">
										<div>
											<div className="flex flex-wrap items-center gap-3">
												<h3 className="font-semibold text-white">{fleet.name}</h3>
												{fleet.agency && (
													<span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
														{fleet.agency}
													</span>
												)}
											</div>
											<p className="mt-1 text-xs text-slate-500">
												Created {fleet.created_at ? new Date(fleet.created_at).toLocaleDateString() : '—'}
											</p>
										</div>
										{confirmDeleteId === fleet.id ? (
											<div className="flex items-center gap-3">
												<span className="text-sm text-red-300">Delete this fleet?</span>
												<button
													type="button"
													onClick={() => setConfirmDeleteId(null)}
													disabled={savingId === fleet.id}
													className="btn btn-outline btn-sm"
												>
													Cancel
												</button>
												<button
													type="button"
													onClick={() => handleDelete(fleet.id)}
													disabled={savingId === fleet.id}
													className="btn btn-error btn-sm"
												>
													{savingId === fleet.id ? 'Deleting…' : 'Delete'}
												</button>
											</div>
										) : (
											<div className="flex gap-3">
												<button type="button" onClick={() => startEdit(fleet)} className="btn btn-outline btn-secondary btn-sm">
													Edit
												</button>
												<button
													type="button"
													onClick={() => setConfirmDeleteId(fleet.id)}
													className="btn btn-outline btn-error btn-sm"
												>
													Delete
												</button>
											</div>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

export default function FleetsManager() {
	return (
		<AppProvider>
			<FleetsManagerInner />
		</AppProvider>
	);
}