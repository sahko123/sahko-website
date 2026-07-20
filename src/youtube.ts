import { formatDate } from './format-date';

export interface Video {
	id: string;
	title: string;
	thumbnail: string;
	publishedAt: string;
}

/** Fetches the channel's most recent uploads, cached in sessionStorage for an hour. */
export async function fetchChannelVideos(
	handle: string,
	key: string,
	maxResults: number
): Promise<Video[]> {
	const cacheKey = `yt-videos:${handle}:${maxResults}`;
	const cached = sessionStorage.getItem(cacheKey);
	if (cached) {
		const { videos, ts } = JSON.parse(cached);
		if (Date.now() - ts < 60 * 60 * 1000) {
			return videos;
		}
	}

	const channelRes = await fetch(
		`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${key}`
	);
	if (!channelRes.ok) throw new Error(`channels.list failed: ${channelRes.status}`);
	const channelData = await channelRes.json();
	const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
	if (!uploadsPlaylistId) throw new Error('No uploads playlist found for handle');

	const itemsRes = await fetch(
		`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${key}`
	);
	if (!itemsRes.ok) throw new Error(`playlistItems.list failed: ${itemsRes.status}`);
	const itemsData = await itemsRes.json();

	const videos: Video[] = (itemsData.items ?? [])
		.map((item: any) => ({
			id: item.snippet.resourceId.videoId,
			title: item.snippet.title,
			thumbnail: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
			publishedAt: item.snippet.publishedAt,
		}))
		.filter((v: Video) => v.thumbnail);

	sessionStorage.setItem(cacheKey, JSON.stringify({ videos, ts: Date.now() }));
	return videos;
}

/** Builds a video card via DOM APIs (no innerHTML) so nothing needs escaping. */
export function videoCard(v: Video): HTMLElement {
	const watchUrl = `https://www.youtube.com/watch?v=${v.id}`;
	const ytLink = (child: HTMLElement) => {
		const a = document.createElement('a');
		a.href = watchUrl;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		a.append(child);
		return a;
	};

	const img = document.createElement('img');
	img.src = v.thumbnail;
	img.alt = v.title;
	img.loading = 'lazy';

	const strong = document.createElement('strong');
	strong.textContent = v.title;

	const date = document.createElement('p');
	date.className = 'muted';
	date.textContent = formatDate(new Date(v.publishedAt));

	const card = document.createElement('div');
	card.className = 'card';
	card.append(ytLink(img), ytLink(strong), date);
	return card;
}

/** Renders an error/empty message the same way a video card is built. */
export function messageCard(text: string): HTMLElement {
	const p = document.createElement('p');
	p.className = 'muted';
	p.textContent = text;
	return p;
}
