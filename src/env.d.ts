/// <reference types="astro/client" />

interface ImportMetaEnv {
	/** Base URL of the Kinesis Cars REST API, e.g. http://localhost:8080/x/cars/ */
	readonly PUBLIC_API_URL: string;
	/** Stripe publishable key used for Checkout redirects. */
	readonly PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
