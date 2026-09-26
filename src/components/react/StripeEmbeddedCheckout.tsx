import { useEffect, useRef, useState } from 'react';

declare global {
	interface Window {
		Stripe?: (publishableKey: string) => StripeJs;
	}
}

/** Minimal surface of Stripe.js Embedded Checkout that we use. */
interface StripeJs {
	createEmbeddedCheckoutPage: (opts: {
		fetchClientSecret: () => string;
		onComplete?: () => void;
	}) => Promise<{ mount: (el: HTMLElement) => void; unmount?: () => void }>;
}

const STRIPE_PK = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;

function loadStripeJs(): Promise<Window['Stripe']> {
	return new Promise((resolve, reject) => {
		if (window.Stripe) {
			resolve(window.Stripe);
			return;
		}
		const script = document.createElement('script');
		// Embedded Checkout (ui_mode="embedded") requires a release that ships
		// `createEmbeddedCheckoutPage`. Basil is the minimum for the newer APIs.
		script.src = 'https://js.stripe.com/basil/stripe.js';
		script.async = true;
		script.onload = () => resolve(window.Stripe);
		script.onerror = () => reject(new Error('Failed to load Stripe.js.'));
		document.head.appendChild(script);
	});
}

export default function StripeEmbeddedCheckout({
	clientSecret,
	onComplete,
}: {
	clientSecret: string;
	onComplete: () => void;
}) {
	const mountRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let checkout: { mount: (el: HTMLElement) => void; unmount?: () => void } | null = null;
		let cancelled = false;

		(async () => {
			try {
				const StripeCtor = await loadStripeJs();
				if (!StripeCtor || cancelled || !mountRef.current) return;
				const stripe = StripeCtor(STRIPE_PK);
				checkout = await stripe.createEmbeddedCheckoutPage({
					fetchClientSecret: () => clientSecret,
					onComplete,
				});
				if (cancelled || !mountRef.current) return;
				checkout.mount(mountRef.current);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to start checkout.');
			}
		})();

		return () => {
			cancelled = true;
			checkout?.unmount?.();
		};
	}, [clientSecret, onComplete]);

	return (
		<div>
			<div ref={mountRef} />
			{error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}
		</div>
	);
}