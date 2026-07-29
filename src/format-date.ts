export function formatDate(date: Date): string {
	return date.toLocaleDateString('en-IE', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * Full year-down-to-the-second timestamp for the footer clock, in the
 * visitor's own local time. Only ever called client-side (site.client.js) —
 * a static build can't know a visitor's timezone in advance, so Layout.astro
 * renders no guess at all and lets the client fill in the real value on
 * load, rather than rendering a build-time value in some other timezone
 * that would then visibly jump once corrected.
 */
export function formatTimestamp(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
		`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
	);
}
