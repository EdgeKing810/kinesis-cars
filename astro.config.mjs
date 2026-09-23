// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
		server: {
			// Dev-only proxy: forwards same-origin requests to the local Kinesis
			// API, avoiding CORS during development (the API doesn't send
			// `Access-Control-Allow-Origin`).
			//   `/x/cars/*` → REST API (PUBLIC_API_URL=/x/cars/)
			//   `/upload`   → media upload (PUBLIC_UPLOAD_ORIGIN empty in dev)
			// The browser only ever talks to the dev server; Vite forwards to
			// http://localhost:8080. Production mirrors this with an nginx
			// proxy_pass in nginx.conf.template.
			proxy: {
				'/x/cars': {
					target: 'http://localhost:8080',
					changeOrigin: true,
				},
				'/upload': {
					target: 'http://localhost:8080',
					changeOrigin: true,
				},
			},
		},
	},
});