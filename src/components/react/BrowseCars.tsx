import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	AppProvider,
	ApiError,
	useApp,
	type Blockout,
	type BlockoutFetchResponse,
	type Vehicle,
	type VehicleFetchResponse,
} from '../../context/AppContext';
import { isVehicleAvailable } from '../../lib/availability';
import { BODY_TYPES, CAR_MAKES, FUEL_TYPES, LOCATIONS, TRANSMISSIONS, formatPrice, humanize } from '../../lib/vehicles';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';

const PAGE_SIZE = 12;
type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'mileage-asc' | 'mileage-desc' | 'name';

const selectClass = 'select select-bordered select-sm w-full';

function CarImage({ vehicle, available }: { vehicle: Vehicle; available: boolean }) {
	const url = (vehicle.pictures ?? []).find((p) => p && (p.startsWith('http') || p.startsWith('/')));
	const usable = url !== undefined;
	return (
		<div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
			{usable ? (
				<img src={url} alt={`${vehicle.car_make} ${vehicle.model}`} className="h-full w-full object-cover" />
			) : (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-slate-700">
					<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
					<circle cx="7" cy="17" r="2" />
					<path d="M9 17h6" />
					<circle cx="17" cy="17" r="2" />
				</svg>
			)}
			<span
				className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
					available ? 'bg-emerald-500 text-slate-950' : 'bg-red-500/90 text-white'
				}`}
			>
				{available ? 'Available' : 'Unavailable'}
			</span>
		</div>
	);
}

function BrowseCarsInner() {
	const { request, auth } = useApp();
	const ready = useMinDelay(1000);

	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [blockoutsByVehicle, setBlockoutsByVehicle] = useState<Record<string, Blockout[]>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [make, setMake] = useState('');
	const [body, setBody] = useState('');
	const [transmission, setTransmission] = useState('');
	const [fuel, setFuel] = useState('');
	const [location, setLocation] = useState('');
	const [availability, setAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<SortKey>('newest');
	const [page, setPage] = useState(0);

	const fetchVehicles = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({ limit: '100', offset: '0' });
			if (make) params.set('make', make);
			if (body) params.set('body', body);
			if (transmission) params.set('transmission', transmission);
			if (fuel) params.set('fuel_type', fuel);
			if (location) params.set('location', location);
			const res = await request<VehicleFetchResponse>(`vehicle/fetch?${params}`);
			setVehicles(res.vehicles ?? []);
			setPage(0);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to load vehicles.');
		} finally {
			setLoading(false);
		}
	}, [make, body, transmission, fuel, location, request]);

	useEffect(() => {
		if (ready) fetchVehicles();
	}, [ready, fetchVehicles]);

	// Fetch all active blockouts (when signed in) to reflect real availability.
	useEffect(() => {
		if (!auth) {
			setBlockoutsByVehicle({});
			return;
		}
		(async () => {
			try {
				const res = await request<BlockoutFetchResponse>(
					`blockout/fetch?id=${encodeURIComponent(auth.id)}&active=true&limit=100&offset=0`,
				);
				const grouped: Record<string, Blockout[]> = {};
				for (const b of res.blockouts ?? []) {
					(grouped[b.vehicle_id] ??= []).push(b);
				}
				setBlockoutsByVehicle(grouped);
			} catch {
				setBlockoutsByVehicle({});
			}
		})();
	}, [auth, request]);

	const isBookable = useCallback(
		(v: Vehicle) => isVehicleAvailable(v, blockoutsByVehicle[v.id] ?? []),
		[blockoutsByVehicle],
	);

	const filtered = useMemo(() => {
		let list = vehicles;
		if (availability === 'available') list = list.filter((v) => isBookable(v));
		else if (availability === 'unavailable') list = list.filter((v) => !isBookable(v));
		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(v) =>
					v.car_make.toLowerCase().includes(q) ||
					v.model.toLowerCase().includes(q) ||
					v.nickname.toLowerCase().includes(q),
			);
		}
		const sorted = [...list];
		switch (sort) {
			case 'price-asc':
				sorted.sort((a, b) => a.price_per_day_cents - b.price_per_day_cents);
				break;
			case 'price-desc':
				sorted.sort((a, b) => b.price_per_day_cents - a.price_per_day_cents);
				break;
			case 'mileage-asc':
				sorted.sort((a, b) => a.mileage_km - b.mileage_km);
				break;
			case 'mileage-desc':
				sorted.sort((a, b) => b.mileage_km - a.mileage_km);
				break;
			case 'name':
				sorted.sort((a, b) => `${a.car_make} ${a.model}`.localeCompare(`${b.car_make} ${b.model}`));
				break;
			default:
				sorted.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
		}
		return sorted;
	}, [vehicles, search, sort, availability, isBookable]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const current = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

	function clearFilters() {
		setMake('');
		setBody('');
		setTransmission('');
		setFuel('');
		setLocation('');
		setAvailability('all');
		setSearch('');
		setSort('newest');
		setPage(0);
	}

	const hasFilters = make || body || transmission || fuel || location || availability !== 'all';

	return (
		<div className="space-y-6">
			{/* Filter bar */}
			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end">
					<div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
						<label className="block">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Make</span>
							<select value={make} onChange={(e) => setMake(e.target.value)} className={selectClass}>
								<option value="">All</option>
								{CAR_MAKES.map((m) => (
									<option key={m} value={m}>{humanize(m)}</option>
								))}
							</select>
						</label>
						<label className="block">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Body</span>
							<select value={body} onChange={(e) => setBody(e.target.value)} className={selectClass}>
								<option value="">All</option>
								{BODY_TYPES.map((b) => (
									<option key={b} value={b}>{humanize(b)}</option>
								))}
							</select>
						</label>
						<label className="block">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Transmission</span>
							<select value={transmission} onChange={(e) => setTransmission(e.target.value)} className={selectClass}>
								<option value="">All</option>
								{TRANSMISSIONS.map((t) => (
									<option key={t} value={t}>{humanize(t)}</option>
								))}
							</select>
						</label>
						<label className="block">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Fuel</span>
							<select value={fuel} onChange={(e) => setFuel(e.target.value)} className={selectClass}>
								<option value="">All</option>
								{FUEL_TYPES.map((f) => (
									<option key={f} value={f}>{humanize(f)}</option>
								))}
							</select>
						</label>
						<label className="block">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Location</span>
							<select value={location} onChange={(e) => setLocation(e.target.value)} className={selectClass}>
								<option value="">All</option>
								{LOCATIONS.map((l) => (
									<option key={l} value={l}>{humanize(l)}</option>
								))}
							</select>
						</label>
						<label className="block">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Availability</span>
							<select
								value={availability}
								onChange={(e) => setAvailability(e.target.value as 'all' | 'available' | 'unavailable')}
								className={selectClass}
							>
								<option value="all">All</option>
								<option value="available">Available</option>
								<option value="unavailable">Unavailable</option>
							</select>
						</label>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row lg:w-auto lg:items-end">
						<label className="block flex-1 lg:w-56">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Search</span>
							<input
								type="text"
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(0);
								}}
								placeholder="Make, model or nickname"
								className="input input-bordered input-sm mt-1 w-full"
							/>
						</label>
						<label className="block flex-1 lg:w-48">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Sort by</span>
							<select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
								<option value="newest">Newest</option>
								<option value="price-asc">Price: low to high</option>
								<option value="price-desc">Price: high to low</option>
								<option value="mileage-asc">Mileage: low to high</option>
								<option value="mileage-desc">Mileage: high to low</option>
								<option value="name">Name A–Z</option>
							</select>
						</label>
						{hasFilters && (
							<button type="button" onClick={clearFilters} className="btn btn-outline btn-error btn-sm">
								Clear
							</button>
						)}
					</div>
				</div>

				{error && (
					<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
						{error}
					</p>
				)}
			</section>

			{/* Results */}
			{!ready || loading ? (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
							<Skeleton className="h-44 w-full rounded-none" />
							<div className="space-y-3 p-5">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-4 w-56" />
								<Skeleton className="h-6 w-28" />
							</div>
						</div>
					))}
				</div>
			) : current.length === 0 ? (
				<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-10 text-center">
					<p className="text-slate-400">No vehicles match your filters.</p>
					<button type="button" onClick={clearFilters} className="btn btn-outline btn-secondary mt-4">
						Clear filters
					</button>
				</section>
			) : (
				<>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{current.map((v) => (
							<a
								key={v.id}
								href={`/car?id=${encodeURIComponent(v.id)}`}
								className="group block overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 transition hover:border-brand-500/40"
							>
								<CarImage vehicle={v} available={isBookable(v)} />
								<div className="p-5">
									<div className="flex items-start justify-between gap-3">
										<div>
											<h3 className="font-semibold text-white">
												{humanize(v.car_make)} {v.model}
											</h3>
											{v.nickname && <p className="text-xs text-slate-500">{v.nickname}</p>}
										</div>
										<p className="shrink-0 text-sm font-semibold text-brand-400">{formatPrice(v.price_per_day_cents)}</p>
									</div>

									<div className="mt-3 flex flex-wrap gap-1.5">
										<span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">{humanize(v.body_type)}</span>
										<span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">{humanize(v.fuel_type)}</span>
										<span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">{humanize(v.transmission)}</span>
										<span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">{humanize(v.location)}</span>
									</div>

									<div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
										<span>{v.seats} seats · {v.doors} doors · {v.mileage_km.toLocaleString()} km</span>
									</div>
								</div>
							</a>
						))}
					</div>

					<div className="flex items-center justify-between">
						<p className="text-sm text-slate-400">
							Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{' '}
							{filtered.length}
						</p>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								disabled={page === 0}
								className="btn btn-outline btn-info btn-sm disabled:opacity-50"
							>
								Previous
							</button>
							<button
								type="button"
								onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
								disabled={page >= pageCount - 1}
								className="btn btn-outline btn-info btn-sm disabled:opacity-50"
							>
								Next
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

export default function BrowseCars() {
	return (
		<AppProvider>
			<BrowseCarsInner />
		</AppProvider>
	);
}