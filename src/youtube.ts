export interface Video {
	id: string;
	title: string;
	thumbnail: string;
	publishedAt: string;
}

function decodeXmlEntities(str: string): string {
	return str
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
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

/**
 * Fetches the channel's most recent upload at build time via YouTube's public
 * RSS feed — no API key involved. Returns null (and logs a warning) on any
 * failure so a flaky network call during build never breaks the site build.
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

		const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
		if (!entry) throw new Error('No entries in feed');

		const id = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
		const title = entry.match(/<title>(.*?)<\/title>/)?.[1];
		const publishedAt = entry.match(/<published>(.*?)<\/published>/)?.[1];
		if (!id || !title || !publishedAt) throw new Error('Missing fields in feed entry');

		return {
			id,
			title: decodeXmlEntities(title),
			thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
			publishedAt,
		};
	} catch (err) {
		console.warn(`[youtube] Could not fetch latest video: ${(err as Error).message}`);
		return null;
	}
}
