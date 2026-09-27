import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';

function MobileMenuInner() {
	const { auth, logout } = useApp();
	const [ready, setReady] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setReady(true);
	}, []);

	if (!ready) return null;

	function handleSignOut() {
		setOpen(false);
		logout();
		window.location.href = '/';
	}

	const linkClass =
		'block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white';

	return (
		<div className="relative sm:hidden">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-label="Menu"
				aria-expanded={open}
				className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-white/30 hover:text-white"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
					<line x1="4" x2="20" y1="7" y2="7" />
					<line x1="4" x2="14" y1="12" y2="12" />
					<line x1="4" x2="20" y1="17" y2="17" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-xl">
					<a href="/browse" onClick={() => setOpen(false)} className={linkClass}>
						Browse cars
					</a>
					{!auth && (
						<a href="/register" onClick={() => setOpen(false)} className={linkClass}>
							For merchants
						</a>
					)}
					<a href="/account" onClick={() => setOpen(false)} className={linkClass}>
						Account
					</a>
					<a href="/bookings" onClick={() => setOpen(false)} className={linkClass}>
						Bookings
					</a>
					<a href="/payments" onClick={() => setOpen(false)} className={linkClass}>
						Payments
					</a>
					<div className="my-2 border-t border-white/10" />
					{auth ? (
						<button type="button" onClick={handleSignOut} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-400/10 hover:text-red-200">
							Sign out
						</button>
					) : (
						<>
							<a href="/login" onClick={() => setOpen(false)} className="btn btn-outline btn-success px-3 py-2 font-semibold w-full">
								Sign in
							</a>
							<a href="/register" onClick={() => setOpen(false)} className="mt-2 btn btn-outline btn-primary px-3 py-2 font-semibold w-full">
								Get started
							</a>
						</>
					)}
				</div>
			)}
		</div>
	);
}

export default function MobileMenu() {
	return (
		<AppProvider>
			<MobileMenuInner />
		</AppProvider>
	);
}