export interface Video {
	id: string;
	title: string;
	thumbnail: string;
	publishedAt: string;
}

function decodeXmlEntities(str: string): string {
	// &amp; must decode last — decoding it first would turn a literal
	// "&amp;lt;" (real text "&lt;", double-escaped) into "<" via the &lt;
	// pass that follows, corrupting titles that contain literal entity text.
	return str
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&amp;/g, '&');
}

async function resolveChannelId(handle: string): Promise<string | null> {
	const res = await fetch(`https://www.youtube.com/@${handle}`);
	if (!res.ok) return null;
	const html = await res.text();
	const match =
		html.match(/rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]+)"/) ??
		html.match(/"externalId":"(UC[\w-]+)"/);
	return match?.[1] ?? null;
}

// A Short's <link rel="alternate"> points at /shorts/{id} instead of
// /watch?v={id} — the feed doesn't have a dedicated "is this a Short" field,
// but this link shape is a reliable stand-in for one.
function isShort(entry: string): boolean {
	return /rel="alternate" href="https:\/\/www\.youtube\.com\/shorts\//.test(entry);
}

function parseEntry(entry: string): Video | null {
	const id = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
	const title = entry.match(/<title>(.*?)<\/title>/)?.[1];
	const publishedAt = entry.match(/<published>(.*?)<\/published>/)?.[1];
	if (!id || !title || !publishedAt) return null;

	return {
		id,
		title: decodeXmlEntities(title),
		thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
		publishedAt,
	};
}

/**
 * Fetches the channel's most recent full-length upload at build time via
 * YouTube's public RSS feed — no API key involved. Prefers the newest
 * non-Short video, falling back to the newest Short if the feed's recent
 * entries are Shorts-only. Returns null (and logs a warning) on any failure
 * so a flaky network call during build never breaks the site build.
 */
export async function getLatestVideo(handle: string): Promise<Video | null> {
	try {
		const channelId = await resolveChannelId(handle);
		if (!channelId) throw new Error(`Could not resolve channel ID for @${handle}`);

		const feedRes = await fetch(
			`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
		);
		if (!feedRes.ok) throw new Error(`Feed fetch failed: ${feedRes.status}`);
		const xml = await feedRes.text();

		const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
		if (entries.length === 0) throw new Error('No entries in feed');

		// Prefer full-length videos over Shorts, but still try every entry in
		// that order — one malformed entry shouldn't waste the rest of the feed.
		const ordered = [...entries.filter((e) => !isShort(e)), ...entries.filter(isShort)];
		const video = ordered.map(parseEntry).find((v): v is Video => v !== null);
		if (!video) throw new Error('No entry in the feed had all required fields');

		return video;
	} catch (err) {
		console.warn(`[youtube] Could not fetch latest video: ${(err as Error).message}`);
		return null;
	}
}
