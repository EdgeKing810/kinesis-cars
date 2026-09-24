import { useCallback, useEffect, useState } from 'react';
import {
	AppProvider,
	ApiError,
	useApp,
	type Fleet,
	type FleetFetchResponse,
	type UserResponse,
	type Vehicle,
	type VehicleFetchResponse,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import { formatPrice, humanize } from '../../lib/vehicles';
import Skeleton from './Skeleton';
import VehicleForm, { type VehicleFormProps } from './VehicleForm';

function VehiclesManagerInner() {
	const { auth, request } = useApp();
	const ready = useMinDelay(1000);

	const [checking, setChecking] = useState(true);
	const [allowed, setAllowed] = useState(false);
	const [accessError, setAccessError] = useState<string | null>(null);

	const [fleets, setFleets] = useState<Fleet[]>([]);
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Vehicle | null>(null);

	const loadData = useCallback(async () => {
		if (!auth) return;
		setLoading(true);
		setError(null);
		try {
			const [fleetRes, vehicleRes] = await Promise.all([
				request<FleetFetchResponse>('fleet/fetch?limit=100&offset=0'),
				request<VehicleFetchResponse>('vehicle/fetch?limit=100&offset=0'),
			]);
			setFleets((fleetRes.fleets ?? []).filter((f) => f.owner_id === auth.id));
			setVehicles((vehicleRes.fleets ?? []).filter((v) => v.owner_id === auth.id));
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to load data.');
		} finally {
			setLoading(false);
		}
	}, [auth, request]);

	useEffect(() => {
		(async () => {
			if (!auth) return;
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
		if (allowed) loadData();
	}, [allowed, loadData]);

	async function handleSubmit(payload: Record<string, unknown>) {
		if (!auth) return;
		setError(null);
		setMessage(null);
		try {
			if (editing) {
				await request('vehicle/update', {
					method: 'PUT',
					body: JSON.stringify({ id: auth.id, vehicle_id: editing.id, ...payload }),
				});
				setMessage('Vehicle updated.');
			} else {
				await request('vehicle/create', {
					method: 'POST',
					body: JSON.stringify({ id: auth.id, ...payload }),
				});
				setMessage('Vehicle created.');
			}
			setShowForm(false);
			setEditing(null);
			await loadData();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to save vehicle.');
		}
	}

	function openCreate() {
		setEditing(null);
		setError(null);
		setMessage(null);
		setShowForm(true);
	}

	function openEdit(vehicle: Vehicle) {
		setEditing(vehicle);
		setError(null);
		setMessage(null);
		setShowForm(true);
	}

	if (ready && !checking && !auth) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
				<h1 className="text-2xl font-bold tracking-tight text-white">Vehicles</h1>
				<p className="mt-2 text-sm text-slate-400">Sign in to manage your vehicles.</p>
				<a href="/login" className="btn btn-primary mt-6">Sign in</a>
			</div>
		);
	}

	if (!ready || checking) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="mt-4 h-11 w-full" />
				<Skeleton className="mt-6 h-20 w-full" />
				<Skeleton className="mt-3 h-20 w-full" />
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
				<h1 className="text-2xl font-bold tracking-tight text-white">Vehicles</h1>
				<p className="mt-2 text-sm text-slate-400">Only merchants and administrators can manage vehicles.</p>
				<a href="/" className="btn btn-outline mt-6">Back to home</a>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-white">Your vehicles</h1>
						<p className="mt-1 text-sm text-slate-400">List and manage the vehicles in your fleet.</p>
					</div>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => loadData()}
							disabled={loading}
							className="btn btn-outline btn-info btn-sm disabled:opacity-60"
						>
							Refresh
						</button>
						{!showForm && (
							<button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
								Add vehicle
							</button>
						)}
					</div>
				</div>

				{message && (
					<p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</p>
				)}
				{error && (
					<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>
				)}

				{showForm && (
					<div className="mt-6 rounded-2xl border border-brand-500/20 bg-slate-950/60 p-6">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-white">{editing ? `Edit ${humanize(editing.car_make)} ${editing.model}` : 'Add a vehicle'}</h2>
							<button
								type="button"
								onClick={() => {
									setShowForm(false);
									setEditing(null);
								}}
								className="btn btn-ghost btn-sm"
							>
								Close
							</button>
						</div>
						<VehicleForm
							fleets={fleets}
							initial={editing}
							submitLabel={editing ? 'Save changes' : 'Create vehicle'}
							onSubmit={handleSubmit as VehicleFormProps['onSubmit']}
						/>
					</div>
				)}
			</section>

			{!showForm && (
				<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
					{loading && (
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-20 w-full" />
							))}
					</div>
				)}

				{!loading && vehicles.length === 0 && (
					<p className="text-sm text-slate-400">You haven't added any vehicles yet.</p>
				)}

				{!loading && vehicles.length > 0 && (
					<div className="space-y-3">
						{vehicles.map((v) => (
							<div key={v.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
								<div>
									<div className="flex flex-wrap items-center gap-3">
										<h3 className="font-semibold text-white">
											{humanize(v.car_make)} {v.model}
										</h3>
										{v.nickname && <span className="text-xs text-slate-500">{v.nickname}</span>}
										{v.is_active ? (
											<span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">Active</span>
										) : (
											<span className="rounded-full border border-slate-500/30 bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-400">Inactive</span>
										)}
									</div>
									<p className="mt-1 text-sm text-slate-400">
										{humanize(v.body_type)} · {humanize(v.fuel_type)} · {humanize(v.transmission)} · {v.location} ·{' '}
										{v.mileage_km.toLocaleString()} km
									</p>
									<p className="mt-1 text-xs text-slate-500">@{v.license_plate || 'no plate'}</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-sm font-semibold text-brand-400">{formatPrice(v.price_per_day_cents)}</span>
									<button type="button" onClick={() => openEdit(v)} className="btn btn-outline btn-secondary btn-sm">
										Edit
									</button>
								</div>
							</div>
						))}
					</div>
				)}
				</section>
			)}
		</div>
	);
}

export default function VehiclesManager() {
	return (
		<AppProvider>
			<VehiclesManagerInner />
		</AppProvider>
	);
}