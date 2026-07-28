export function formatDate(date: Date): string {
	return date.toLocaleDateString('en-IE', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * Full year-down-to-the-second timestamp for the footer clock, shared by
 * Layout.astro's build-time initial render and site.client.js's live tick.
 * Uses UTC on both sides — the build machine and a visitor's browser are
 * essentially never in the same timezone, so anything based on local time
 * would visibly jump the instant the client-side tick takes over.
 */
export function formatTimestamp(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		`${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
		`${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`
	);
}
