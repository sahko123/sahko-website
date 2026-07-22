// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://sahko.ie',
	output: 'static',
	build: {
		// The site is small enough that Astro would otherwise inline this CSS
		// into every page's HTML — fine for one page, wasteful once every page
		// re-downloads the same identical bytes. Force it to a single external
		// file the browser fetches once and caches across the whole site.
		inlineStylesheets: 'never',
	},
});
