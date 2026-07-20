export const SITE_TITLE = 'Sahko';
export const SITE_DESCRIPTION = "Sahko's channel — videos, posts, and links.";

export const NAV_LINKS = [
	{ href: '/', label: 'Home' },
	{ href: '/videos/', label: 'Videos' },
	{ href: '/blog/', label: 'Blog' },
];

export const SOCIAL_LINKS = [
	{ href: 'https://www.youtube.com/@Sahko123', label: 'YouTube' },
	// { href: 'https://twitter.com/yourhandle', label: 'Twitter' },
	// { href: 'https://twitch.tv/yourhandle', label: 'Twitch' },
];

// YouTube handle (without the @) used by the client-side video feed.
export const YOUTUBE_HANDLE = 'Sahko123';

// TODO: create a YouTube Data API v3 key at https://console.cloud.google.com/apis/credentials
// Restrict it to "HTTP referrers" = https://sahko.ie/* before shipping, since this key
// ships in client-side JS and is publicly visible. Without a key the videos page shows
// a setup notice instead of fetching.
export const YOUTUBE_API_KEY = '';
