import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';

function AuthNavInner() {
	const { auth, logout } = useApp();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(true);
	}, []);

	function handleSignOut() {
		logout();
		window.location.href = '/';
	}

	if (!ready) {
		return null;
	}

	if (auth) {
		return (
			<div className="flex items-center gap-2">
				<a
					href="/account"
					className="btn btn-ghost btn-sm hidden text-white hover:text-brand-300 sm:inline-flex"
				>
					Account
				</a>
				<button
					type="button"
					onClick={handleSignOut}
					className="btn btn-outline btn-error btn-sm"
				>
					Sign out
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<a href="/login" className="btn btn-outline btn-info btn-sm">
				Sign in
			</a>
			<a href="/register" className="btn btn-primary btn-sm">
				Get started
			</a>
		</div>
	);
}

export default function AuthNav() {
	return (
		<AppProvider>
			<AuthNavInner />
		</AppProvider>
	);
}