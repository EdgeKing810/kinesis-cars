import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';

function AuthAwareCTAInner({
	signedOutHref,
	signedOutLabel,
	signedInHref,
	signedInLabel,
	className,
}: {
	signedOutHref: string;
	signedOutLabel: string;
	signedInHref: string;
	signedInLabel: string;
	className: string;
}) {
	const { auth } = useApp();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(true);
	}, []);

	if (!ready) return null;

	return (
		<a href={auth ? signedInHref : signedOutHref} className={className}>
			{auth ? signedInLabel : signedOutLabel}
		</a>
	);
}

export default function AuthAwareCTA(props: {
	signedOutHref: string;
	signedOutLabel: string;
	signedInHref: string;
	signedInLabel: string;
	className: string;
}) {
	return (
		<AppProvider>
			<AuthAwareCTAInner {...props} />
		</AppProvider>
	);
}