import { useEffect, useState } from 'react';
import { AppProvider, ApiError, useApp, type Vehicle, type VehicleFetchResponse } from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import { formatPrice, humanize } from '../../lib/vehicles';
import Skeleton from './Skeleton';

function FeaturedCarsInner() {
  const { request } = useApp();
  const ready = useMinDelay(450);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await request<VehicleFetchResponse>('vehicle/fetch?limit=6');
        setVehicles((res.vehicles ?? []).slice(0, 6));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load vehicles.');
      }
    })();
  }, [request]);

  if (!ready) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((v) => {
        const img = (v.pictures ?? []).find((p) => p && (p.startsWith('http') || p.startsWith('/')));
        return (
          <a
            key={v.id}
            href={`/car?id=${encodeURIComponent(v.id)}`}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 transition hover:border-brand-500/40"
          >
            <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
              {img ? (
                <img
                  src={img}
                  alt={`${v.car_make} ${v.model}`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-16 w-16 text-slate-700"
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              )}
              <span
                className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${v.is_active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-600/70 text-slate-200'}`}
              >
                {v.is_active ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">
                    {humanize(v.car_make)} {v.model}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {humanize(v.body_type)} · {humanize(v.fuel_type)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-brand-400">{formatPrice(v.price_per_day_cents)}</p>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export default function FeaturedCars() {
  return (
    <AppProvider>
      <FeaturedCarsInner />
    </AppProvider>
  );
}
