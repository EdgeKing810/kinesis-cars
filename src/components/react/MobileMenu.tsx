import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';

function MobileMenuInner() {
	const { auth } = useApp();
	const [ready, setReady] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setReady(true);
	}, []);

	if (!ready) return null;

	return (
		<div className="relative md:hidden">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-label="Menu"
				className="btn btn-ghost btn-sm text-white"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
					<line x1="4" x2="20" y1="6" y2="6" />
					<line x1="4" x2="20" y1="12" y2="12" />
					<line x1="4" x2="20" y1="18" y2="18" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-xl">
					<a href="/browse" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
						Browse cars
					</a>
					{!auth && (
						<a href="/register" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
							For merchants
						</a>
					)}
					<a href="/account" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
						Account
					</a>
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