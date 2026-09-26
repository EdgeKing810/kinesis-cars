import { useEffect, useState } from 'react';
import {
	AppProvider,
	ApiError,
	useApp,
	type Blockout,
	type BlockoutFetchResponse,
	type Fleet,
	type FleetFetchResponse,
	type Vehicle,
	type VehicleFetchResponse,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import { formatPrice, humanize } from '../../lib/vehicles';
import { findBlockingBlockout } from '../../lib/availability';
import Skeleton from './Skeleton';
import BookingPanel from './BookingPanel';

type Status = 'loading' | 'error' | 'done';

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
			<dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
			<dd className="mt-0.5 text-sm font-medium text-white">{value || '—'}</dd>
		</div>
	);
}

function VehicleDetailsInner() {
	const { request, auth } = useApp();
	const ready = useMinDelay(450);

	const [status, setStatus] = useState<Status>('loading');
	const [error, setError] = useState('');
	const [vehicle, setVehicle] = useState<Vehicle | null>(null);
	const [fleet, setFleet] = useState<Fleet | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [activeBlockouts, setActiveBlockouts] = useState<Blockout[]>([]);

	useEffect(() => {
		const id = new URLSearchParams(window.location.search).get('id');
		if (!id) {
			setStatus('error');
			setError('No vehicle id was provided.');
			return;
		}
		(async () => {
			try {
				const res = await request<VehicleFetchResponse>(
					`vehicle/fetch?vehicle_id=${encodeURIComponent(id)}&limit=1&offset=0`,
				);
				const v = res.vehicles?.[0] ?? null;
				if (!v) {
					setStatus('error');
					setError('Vehicle not found.');
					return;
				}
				setVehicle(v);
				setActiveIndex(0);
				if (v.fleet_id) {
					try {
						const fr = await request<FleetFetchResponse>(
							`fleet/fetch?fleet_id=${encodeURIComponent(v.fleet_id)}&limit=1&offset=0`,
						);
						setFleet(fr.fleets?.[0] ?? null);
					} catch {
						/* fleet info is optional */
					}
				}
				setStatus('done');
			} catch (err) {
				setStatus('error');
				setError(err instanceof ApiError ? err.message : 'Failed to load the vehicle.');
			}
		})();
	}, [request]);

	useEffect(() => {
		if (!auth || !vehicle) return;
		(async () => {
			try {
				const res = await request<BlockoutFetchResponse>(
					`blockout/fetch?id=${encodeURIComponent(auth.id)}&vehicle_id=${encodeURIComponent(vehicle.id)}&active=true&limit=10&offset=0`,
				);
				setActiveBlockouts(res.blockouts ?? []);
			} catch {
				setActiveBlockouts([]);
			}
		})();
	}, [auth, vehicle, request]);

	if (!ready || status === 'loading') {
		return (
			<div className="space-y-6">
				<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
					<Skeleton className="h-64 w-full rounded-2xl" />
					<Skeleton className="mt-6 h-8 w-64" />
					<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 9 }).map((_, i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				</section>
			</div>
		);
	}

	if (status === 'error') {
		return (
			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-10 text-center">
				<h1 className="text-2xl font-bold text-white">Vehicle not found</h1>
				<p className="mt-2 text-sm text-red-300">{error}</p>
				<a href="/browse" className="btn btn-outline btn-info mt-6">Back to browse</a>
			</section>
		);
	}

	if (!vehicle) return null;

	const pictures = (vehicle.pictures ?? []).filter((p) => p.startsWith('http') || p.startsWith('/'));
	const currentImage = pictures[activeIndex] ?? '';
	const prevImage = () => setActiveIndex((i) => (i - 1 + pictures.length) % pictures.length);
	const nextImage = () => setActiveIndex((i) => (i + 1) % pictures.length);

	const opts = (vehicle.options ?? []).map((s) => s.trim()).filter(Boolean);
	const addl = (vehicle.additional ?? []).map((s) => s.trim()).filter(Boolean);

	const blockout = findBlockingBlockout(vehicle, activeBlockouts);
	const isBlocked = blockout !== null;
	const bookable = vehicle.is_active && !isBlocked;

	return (
		<>
			<div className="space-y-6">
			<div>
				<a href="/browse" className="btn btn-ghost btn-sm -ml-2">
					← Browse cars
				</a>
			</div>

			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<div className="grid gap-8 lg:grid-cols-2">
					<div>
						<div className="relative flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900">
							{currentImage ? (
								<button type="button" onClick={() => setLightboxOpen(true)} className="h-full w-full cursor-zoom-in" title="View full size">
									<img src={currentImage} alt={`${vehicle.car_make} ${vehicle.model}`} className="h-full w-full object-cover" />
								</button>
							) : (
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-20 w-20 text-slate-700">
									<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
									<circle cx="7" cy="17" r="2" />
									<path d="M9 17h6" />
									<circle cx="17" cy="17" r="2" />
								</svg>
							)}
							{pictures.length > 1 && (
								<>
									<button
										type="button"
										onClick={prevImage}
										aria-label="Previous image"
										className="btn btn-circle btn-ghost absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white backdrop-blur hover:bg-black/60"
									>
										‹
									</button>
									<button
										type="button"
										onClick={nextImage}
										aria-label="Next image"
										className="btn btn-circle btn-ghost absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white backdrop-blur hover:bg-black/60"
									>
										›
									</button>
									<span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur">
										{activeIndex + 1} / {pictures.length}
									</span>
								</>
							)}
						</div>
						{pictures.length > 1 && (
							<div className="mt-3 flex gap-2 overflow-x-auto">
								{pictures.map((p, i) => (
									<button
										key={i}
										type="button"
										onClick={() => setActiveIndex(i)}
										className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${activeIndex === i ? 'border-brand-500' : 'border-white/10'}`}
									>
										<img src={p} alt="" className="h-full w-full object-cover" />
									</button>
								))}
							</div>
						)}
					</div>

					<div>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<h1 className="text-3xl font-bold tracking-tight text-white">
									{humanize(vehicle.car_make)} {vehicle.model}
								</h1>
								{vehicle.nickname && <p className="mt-1 text-sm text-slate-400">{vehicle.nickname}</p>}
							</div>
							<p className="text-xl font-bold text-brand-400">{formatPrice(vehicle.price_per_day_cents)}</p>
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{humanize(vehicle.body_type)}</span>
							<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{humanize(vehicle.fuel_type)}</span>
							<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{humanize(vehicle.transmission)}</span>
							<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{vehicle.location}</span>
							{bookable ? (
								<span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950">Available</span>
							) : (
								<span className="rounded-full bg-slate-600/40 px-3 py-1 text-xs font-semibold text-slate-300">Unavailable</span>
							)}
						</div>

						{isBlocked ? (
							<div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
								<p className="text-sm font-medium text-red-300">
									Unavailable —{' '}
									{blockout?.reason !== 'BOOKING'
										? (blockout?.reason ?? 'unavailable').toLowerCase().replace('_', ' ')
										: 'booked'}
									{blockout?.end_date ? ` until ${new Date(blockout.end_date).toLocaleString()}` : ''}
								</p>
								{blockout?.note && <p className="mt-1 text-sm text-red-200/80">{blockout.note}</p>}
							</div>
						) : bookable ? (
							auth ? (
								<div className="mt-6">
									<BookingPanel vehicle={vehicle} />
								</div>
							) : (
								<div className="mt-6 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-5">
									<p className="text-sm text-slate-300">
										Rent from <span className="font-semibold text-white">{formatPrice(vehicle.price_per_day_cents)}</span>,{' '}
										minimum {vehicle.min_rent_days} day{vehicle.min_rent_days !== 1 ? 's' : ''}
										{vehicle.max_rent_days < 999 && ` up to ${vehicle.max_rent_days} days`}.
									</p>
									<a
										href={`/login?next=/car?id=${encodeURIComponent(vehicle.id)}`}
										className="btn btn-primary btn-sm mt-4"
									>
										Sign in to book
									</a>
								</div>
							)
						) : (
							<p className="mt-6 rounded-2xl border border-slate-500/20 bg-slate-500/10 p-5 text-sm text-slate-400">
								This vehicle is currently unavailable for rental.
							</p>
						)}
					</div>
				</div>
			</section>

			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<h2 className="text-lg font-semibold text-white">Details</h2>
				<dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<DetailRow label="Make" value={humanize(vehicle.car_make)} />
					<DetailRow label="Model" value={vehicle.model} />
					<DetailRow label="Body type" value={humanize(vehicle.body_type)} />
					<DetailRow label="Color" value={vehicle.color} />
					<DetailRow label="Doors" value={String(vehicle.doors)} />
					<DetailRow label="Seats" value={String(vehicle.seats)} />
					<DetailRow label="Transmission" value={humanize(vehicle.transmission)} />
					<DetailRow label="Fuel type" value={humanize(vehicle.fuel_type)} />
					<DetailRow label="Mileage" value={`${vehicle.mileage_km.toLocaleString()} km`} />
					<DetailRow label="First registered" value={vehicle.registration} />
					<DetailRow label="Location" value={vehicle.location} />
					<DetailRow label="License plate" value={vehicle.license_plate} />
					<DetailRow label="Min rent" value={`${vehicle.min_rent_days} day${vehicle.min_rent_days !== 1 ? 's' : ''}`} />
					<DetailRow label="Max rent" value={`${vehicle.max_rent_days} day${vehicle.max_rent_days !== 1 ? 's' : ''}`} />
					{fleet && <DetailRow label="Fleet" value={fleet.name} />}
					{vehicle.created_at && (
						<DetailRow label="Listed" value={new Date(vehicle.created_at).toLocaleDateString()} />
					)}
				</dl>

				{(opts.length > 0 || addl.length > 0) && (
					<div className="mt-6 grid gap-6 sm:grid-cols-2">
						{opts.length > 0 && (
							<div>
								<h3 className="text-sm font-semibold text-white">Options</h3>
								<div className="mt-2 flex flex-wrap gap-2">
									{opts.map((o, i) => (
										<span key={i} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{o}</span>
									))}
								</div>
							</div>
						)}
						{addl.length > 0 && (
							<div>
								<h3 className="text-sm font-semibold text-white">Additional features</h3>
								<div className="mt-2 flex flex-wrap gap-2">
									{addl.map((a, i) => (
										<span key={i} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{a}</span>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</section>
		</div>

		{lightboxOpen && currentImage && (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
				onClick={() => setLightboxOpen(false)}
			>
				<div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
					<img
						src={currentImage}
						alt={`${vehicle?.car_make} ${vehicle?.model}`}
						className="max-h-[85vh] w-full rounded-2xl object-contain"
					/>

					{pictures.length > 1 && (
						<>
							<button
								type="button"
								onClick={prevImage}
								aria-label="Previous image"
								className="btn btn-circle btn-ghost absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white backdrop-blur hover:bg-black/60"
							>
								‹
							</button>
							<button
								type="button"
								onClick={nextImage}
								aria-label="Next image"
								className="btn btn-circle btn-ghost absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white backdrop-blur hover:bg-black/60"
							>
								›
							</button>
							<span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur">
								{activeIndex + 1} / {pictures.length}
							</span>
						</>
					)}

					<button
						type="button"
						onClick={() => setLightboxOpen(false)}
						className="btn btn-ghost btn-sm absolute -top-12 right-0 text-white"
					>
						Close
					</button>
				</div>
			</div>
		)}
		</>
	);
}

export default function VehicleDetails() {
	return (
		<AppProvider>
			<VehicleDetailsInner />
		</AppProvider>
	);
}