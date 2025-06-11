import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		{
			name: 'copy-leaflet-images',
			buildStart() {
				const leafletImages = resolve('node_modules/leaflet/dist/images');
				const staticImages = resolve('static');

				try {
					mkdirSync(staticImages, { recursive: true });
					// Copy the marker icons
					copyFileSync(`${leafletImages}/marker-icon-2x.png`, `${staticImages}/marker-icon-2x.png`);
					copyFileSync(`${leafletImages}/marker-icon.png`, `${staticImages}/marker-icon.png`);
					copyFileSync(`${leafletImages}/marker-shadow.png`, `${staticImages}/marker-shadow.png`);
				} catch (err) {
					console.warn('Could not copy Leaflet images:', err);
				}
			}
		}
	]
});
