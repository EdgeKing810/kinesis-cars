import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';

function ForMerchantsLinkInner() {
	const { auth } = useApp();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(true);
	}, []);

	if (!ready || auth) return null;

	return <a href="/register" className="transition hover:text-white">For merchants</a>;
}

export default function ForMerchantsLink() {
	return (
		<AppProvider>
			<ForMerchantsLinkInner />
		</AppProvider>
	);
}